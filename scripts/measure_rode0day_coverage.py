#!/usr/bin/env python3
import os
import glob
import subprocess
import pdb

import json
import yaml
import csv
import pickle

from drcov import DrcovData
from datetime import datetime
from blist import sortedlist

# CONFIGURATION

DYNAMO_RIO_PATH='~/dynamorio/v7/' # Path to dynamo rio install. Within this directory,
                                  # you must have bin32/drrun and bin64/drrun
SKIP_CHALS=[15, 18]
OUTDIR="vis_data"

# END OF CONFIGURATION

def _extract_blocks(cid, chal, upload_fname, drcov_name=None):
    """
    Helper function to return a DrcovData object of running the given challenge on an input file
    """
    FNULL = open(os.devnull, 'w')

    # Extract info from filename: team_id/bug_id
    upload_info = upload_fname.split("/")[-3:]
    team_id = int(upload_info[1])
    bug_id  = int(upload_info[2])

    # Build up our vars about the target binary
    chal_dir = "../bins/built/{:02}".format(cid)
    chal_cmd = chal_dir + "/" + chal["binary_path"]
    arch = "64" if "64" in chal["architecture"] else "32"
    args = chal["binary_arguments"]
    lib_path = ""
    if "library_dir" in chal:
        lib_path = os.path.join(chal_dir, chal["library_dir"])
    targ_cmd_with_args = "{} {}".format(chal_cmd, args.format(input_file=upload_fname, install_dir=chal_dir))
    #print("Team {} bug {}: {}".format(team_id, bug_id, targ_cmd_with_args))

    # Now prepare to run drrun on the target
    drrun = DYNAMO_RIO_PATH  + "/bin{}/drrun".format(arch)

    # First make an directory for our output (since we can't specify drrun out filename)
    outdir = "{}/{}/drcov".format(OUTDIR, cid)
    for existing_log in glob.glob(outdir+"/*.log"):
        os.remove(existing_log)
    os.makedirs(outdir, exist_ok=True)

    # Now silently run the program with drcov
    drcov_targ = "{} -t drcov -logdir {} -- {}".format(drrun, outdir, targ_cmd_with_args)
    #print(drcov_targ)
    subprocess.run(drcov_targ, cwd=os.getcwd(), shell=True, stderr=FNULL, stdout=FNULL)

    # Get result filename, assert if uncertain
    result = glob.glob(outdir+"/*.log")
    assert(len(result)==1), "Multiple drcov log files generated- Unsure which one to use: - looking in {} {}".format(outdir, result)
    result = result[0]


    #assert os.stat(result).st_size != 0, "Generated empty drcov file with command:\n\t{}".format(drcov_targ)
    if os.stat(result).st_size == 0:
        print ("WARNING: couldn't collect coverage of challenge {} with input {}".format(cid, upload_fname))
        os.remove(result)
        return None

    # Now open the result file with drcov.py and extract BBs
    try:
        d = DrcovData(result)
    except Exception as e:
        print("Exception while processing {}: {}".format(result, e))
        raise

    # Rename drcov log to teamid.drcov
    if drcov_name:
        os.rename(result, "{}/{}.drcov".format(outdir, drcov_name))

    return d

def collect_timed_traces(info):
    """
    For each challenge, for each team, build mapping from {rel_time: [blocks covered]}
    """
    chals = info['challenges']
    for chal_name, chal in chals.items():
        cid = chal['challenge_id']

        if cid in SKIP_CHALS:
            print("SKIPPING blacklisted challenge {}".format(cid))
            continue

        # pickle for _all_ teams
        picklefile = "{}/{}/time_traces.pickle".format(OUTDIR, cid)
        os.makedirs("{}/{}".format(OUTDIR, cid), exist_ok=True)

        if os.path.isfile(picklefile):
            print("Skipping {} since we already have a pickle".format(cid))
            continue

        print("Processing challenge {}".format(cid))
        challenge_bbs = sortedlist()
        input_bbs = {} # team_name: [{bugid: [bb start list], bugid2: [bb_start_list1]}] (may want timestamps later)
        input_bbs[0] = {} # input_bbs[0] are solutions


        # Get BBs for each upload
        for team_dir in glob.glob("../all_uploads/{}/*".format(cid)):
            team_id = int(team_dir.split("/")[-1])
            team_pickle = "{}/{}/time_{}.pickle".format(OUTDIR, cid, team_id)

            rodeo_id = int(team_dir.split("/")[-2])

            team_uploads = glob.glob("{}/*".format(team_dir))
            print("\tProcessing uploads from team {}. {} inputs...".format(team_id, len(team_uploads)))

            # now get traces for each and connect to times
            input_bbs[team_id] = {} # "{timestamp: list of bb cov list}"

            for upload_fname in team_uploads:
                time_str = upload_fname.split("/")[-1]
                #print("Team {} timestr {}".format(team_id, time_str))
                try:
                    time_obj = datetime.strptime(time_str, '%Y_%m_%d_%H_%M_%S_%f')
                except ValueError: # Two possible time formats
                    if rodeo_id == 2:
                        time_obj = datetime.strptime(time_str, '%d_%H_%M_%S_%f')
                        time_obj = time_obj.replace(month = 4, year=2018) # Month of may
                    else:
                        raise

                assert(time_obj.timestamp() > 0) # Wat

                # Now get BB list
                #print(time_obj)
                cov_file = "team{}_id_time{}".format(team_id, time_obj.timestamp())
                cov_path = "{}/{}/drcov/{}.drcov".format(OUTDIR, cid, cov_file)
                os.makedirs("{}/{}/drcov".format(OUTDIR, cid), exist_ok=True)
                if not os.path.isfile(cov_path):
                    d = _extract_blocks(cid, chal, upload_fname, cov_file)
                else:
                    # Open drrio file off disk instead of redoing the analysis
                    try:
                        d = DrcovData(cov_path)
                    except Exception as e:
                        print("Exception while processing {}: {}".format(upload_fname, e))
                        raise

                if d is None:
                    print("Failure parsing {}".format(upload_fname))
                    continue

                # We only care about coverage within our modules
                our_modules = [m.id for m in d.modules if 'bins/built' in m.path]
                # TODO: if we ever have multiple modules their addresses from drrun might overlap
                assert(len(our_modules) == 1), "NotYetImplemented multiple modules with overlapping addresses"

                this_trace = []
                for bb in d.basic_blocks:
                    if bb.mod_id not in our_modules:
                        continue
                    start = d.modules[bb.mod_id].base + bb.start
                    end = start + bb.size - 1
                    if (start, end) not in challenge_bbs:
                        challenge_bbs.add((start, end))
                    this_trace.append(start)

                input_bbs[team_id][time_obj.timestamp()] =  this_trace
                # end for each BB

            print("Dumping state for team {}".format(team_id))
            pickle.dump(input_bbs[team_id], open(team_pickle, "wb"))
            # end for each input team submitted

        # Save results of challenge: all BB start/end from across each challenge, plus BB starts for each input
        pickle.dump([challenge_bbs, input_bbs], open(picklefile, "wb"))
        # end for all teams on a given challenge
    # end for each challenge

# Dump tid: bbs to yaml
# Old: check out extract_info_vis_by team
def extract_info_vis(info):
    chals = info['challenges']
    for chal_name, chal in chals.items():
        cid = chal['challenge_id']

        p1 = "{}/{}/time_traces.pickle".format(OUTDIR, cid)
        outfile_y = "{}/{}/result.yaml".format(OUTDIR, cid)
        outfile_j = "{}/{}/result.json".format(OUTDIR, cid)
        os.makedirs("{}/{}".format(OUTDIR, cid), exist_ok=True)

        if os.path.isfile(outfile_j) and os.path.isfile(outfile_y):
            print("Found existing yaml and json for {:02} - Skipping".format(cid))
            continue

        if cid in SKIP_CHALS:
            print("SKIPPING blacklisted challenge {}".format(cid))
            continue

        print("Reformatting DUA/ATPs for {}".format(cid))

        if not os.path.isfile(p1):
           print("Missing ATP/DUA pickle")
           continue

        [challenge_bbs, input_bbs] = pickle.load(open(p1, "rb"))

        if not os.path.isfile(outfile_y):
            print("Saving file {}".format(outfile_y))
            with open(outfile_y, "w") as f:
                yaml.dump(input_bbs, f)

        if not os.path.isfile(outfile_j):
            print("Saving file {}".format(outfile_j))
            with open(outfile_j, "w") as f:
                json.dump(input_bbs, f)

def extract_info_vis_by_team(info, team):
    chals = info['challenges']
    for chal_name, chal in chals.items():
        cid = chal['challenge_id']

        p1 = "{}/{}/time_{}.pickle".format(OUTDIR, cid, team)
        #outfile_y = "{}/{}/result.yaml".format(OUTDIR, cid)
        outfile_j = "{}/{}/result_{}.json".format(OUTDIR, cid, team)
        os.makedirs("{}/{}".format(OUTDIR, cid), exist_ok=True)

        if os.path.isfile(outfile_j): # and os.path.isfile(outfile_y):
            print("Found existing yaml and json for {:02} - Skipping".format(cid))
            continue

        if cid in SKIP_CHALS:
            print("SKIPPING blacklisted challenge {}".format(cid))
            continue

        print("Reformatting DUA/ATPs for {}".format(cid))

        if not os.path.isfile(p1):
           print("Missing ATP/DUA pickle")
           continue

        team_input_bbs_s = pickle.load(open(p1, "rb"))
        team_input_bbs = {}
        for k, v in team_input_bbs_s.items():
            team_input_bbs[float(k)] = v

        t0 = min(team_input_bbs.keys())

        clean_bbs = {} # sets of unique BBs covered at each time
        last_time = None # Key of last item parsed

        for cur_ts,v in sorted(team_input_bbs.items()):
            clean_bbs[cur_ts-t0] = set(v) # Remove duplicates
            if last_time:
                clean_bbs[cur_ts-t0] |= (clean_bbs[last_time]) # Add prior coverage

            last_time = (cur_ts-t0)

        # Convert dict of sets into a dict of lists
        clean_bbs_l = {}
        for k,v in clean_bbs.items():
            clean_bbs_l[k] = list(v)

        #if not os.path.isfile(outfile_y):
        #    print("Saving file {}".format(outfile_y))
        #    with open(outfile_y, "w") as f:
        #        yaml.dump(input_bbs, f)

        if not os.path.isfile(outfile_j):
            print("Saving file {}".format(outfile_j))
            with open(outfile_j, "w") as f:
                json.dump(clean_bbs_l, f)


def parse_info_vis(info):
    chals = info['challenges']
    os.makedirs("processed", exist_ok=True)

    for chal_name, chal in chals.items():
        cid = chal['challenge_id']
        outdir = "{}/processed/{}".format(OUTDIR, cid)
        os.makedirs(outdir, exist_ok=True)

        with open("{}/{}/result.json".format(OUTDIR, cid), "r") as f:
            data = json.loads(f.read())

        # First just calculate coverage of each input
        rel_times = []
        for team_id, team_data in data.items():
            if not len(team_data.keys()):
                print("Skipping team {} with no data".format(team_id))
                continue
            min_team_time = min([float(x) for x in team_data.keys()])

            for ts, cov in team_data.items():
                rel_times.append({"Team": team_id, "Time": (round(float(ts)-min_team_time, 2)), "Blocks covered": len(cov)})

        with open ("{}/rel_time_cov.json".format(outdir), "w") as f:
            json.dump(rel_times, f)

        # Then do cumulative coverage
        rel_times = []
        for team_id, team_data in data.items():
            if not len(team_data.keys()):
                print("Skipping team {} with no data".format(team_id))
                continue
            min_team_time = min([float(x) for x in team_data.keys()])

            assert(min_team_time > 0), pdb.set_trace()

            this_team_covered = set()
            last_time = None
            for ts, cov in sorted(team_data.items(), key=lambda kv: float(kv[0])): # Sorted from oldest to newest
                if last_time:
                    assert(ts >= last_time), print("Have timestamp {} vs last {}".format(ts, last_time))
                last_time = ts
                this_team_covered.update(cov)
                rel_times.append({"Team": team_id, "Time": (round(float(ts)-min_team_time, 2)), "Cumulative Blocks Covered": len(this_team_covered)})


        with open ("{}/rel_time_cum_cov.json".format(outdir), "w") as f:
            json.dump(rel_times, f)




if __name__ == '__main__':
    # First check for valid dynamo rio path
    DYNAMO_RIO_PATH = os.path.expanduser(DYNAMO_RIO_PATH)
    for f in [DYNAMO_RIO_PATH + x for x in ["/bin32/drrun", "/bin64/drrun"]]:
        if not os.path.isfile(f):
            raise RuntimeError("Missing required dynamorio utilities in '{}'".format(f))

    os.makedirs(OUTDIR, exist_ok=True)

    info = yaml.load(open("../info_all.yaml"))
    chals = info['challenges']

    print("Collecting traces for each input...")
    collect_timed_traces(info)
    # Saves output to [OUTDIR]/[cid]/time_traces.pickle

    print("Extracting information from traces")
    #extract_info_vis(info)
    extract_info_vis_by_team(info, 14)


    #print("Parsing trace information")
    #parse_info_vis(info)
