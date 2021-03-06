#!/usr/bin/env node

var fs = require('fs');

var db = require('./../models');
var AFAddressBook = require('./../helper/AFAddressBook');
var func = require('./../globalFunc');

var argc = process.argv.length;

if (argc < 4) {
    console.error('Usage: ' + process.argv[1] + 'qfile why jobtime [nextTry]');
    process.exit(1);
}

var debug = false;
var quiet = true;

var qfile = process.argv[2];
var why = process.argv[3];
var jobtime = (argc >= 5) ? process.argv[4] : null;
var nextTry = (argc >= 6) ? process.argv[5] : null;

// open qfile for sender information
if (!fs.existsSync(qfile)) {
    console.error(`${qfile} doesn't exist`);
    process.exit(1);
}

func.faxlog(`notify> Executing: ${qfile} ${why} ${jobtime} ${nextTry} (${process.argv.length})`, true);

// parse "why" argument
var faxdone = false;
var fatal = false;
var alert = false;

switch ( why ) {
    case 'done':
        faxdone = true;
        break;

    case 'blocked':
    case 'requeued':
        alert = true;
        break;

    case 'format_failed':
    case 'no_formatter':
    case 'poll_no_document':
    case "killed":
    case "rejected":
    case "removed":
    case "timedout":
    case "poll_rejected":
    case "poll_failed":
    default:
        fatal = true;
        break;
}

var file_data = fs.readFileSync(qfile);
var faxfiles = [];
var file_cnt = 0;

var totpages, status, external, jobid, mailaddr, groupid, to_location, to_voice, to_person, to_company, regarding, owner;

file_data.forEach( (line) => {
    line = line.trim();
    var line_info = line.split(':');

    if (line_info[0] === 'totpages') {
        totpages = line_info[1];
        console.log(line_info[0] + ': ' + totpages);
    }
    else if (line_info[0] === 'status') {
        status = line_info[1];
        console.log(line_info[0] + ': ' + status);
    }
    else if (line_info[0] === 'external') {
        external = func.clean_faxnum(line_info[1]);
        console.log(line_info[0] + ': ' + external);
    }
    else if (line_info[0] === 'jobid') {
        jobid = line_info[1];
        console.log(line_info[0] + ': ' + jobid);
    }
    else if (line_info[0] === 'mailaddr') {
        mailaddr = line_info[1];
        console.log(line_info[0] + ': ' + mailaddr);
    }
    else if (line_info[0] === 'groupid') {
        groupid = line_info[1];
        console.log(line_info[0] + ': ' + groupid);
    }
    else if (line_info[0] === 'location') {
        to_location = func.isset(line_info[1]) ? line_info[1] : null;
        console.log(line_info[0] + ': ' + to_location);
    }
    else if (line_info[0] === 'voice') {
        to_voice = func.isset(line_info[1]) ? line_info[1] : null;
        console.log(line_info[0] + ': ' + to_voice);
    }
    else if (line_info[0] === 'receiver') {
        to_person = func.isset(line_info[1]) ? line_info[1] : null;
        console.log(line_info[0] + ': ' + to_person);
    }
    else if (line_info[0] === 'company') {
        to_company = func.isset(line_info[1]) ? line_info[1] : null;
        console.log(line_info[0] + ': ' + to_company);
    }
    else if (line_info[0] === 'regarding') {
        regarding = func.isset(line_info[1]) ? line_info[1] : null;
        console.log(line_info[0] + ': ' + regarding);
    }
    else if (line_info[0] === 'owner') {
        owner = line_info[1].toLowerCase();
        console.log(line_info[0] + ': ' + owner);
    }
    else {
        if (line_info[0].match(/postscript/) || line_info[0].match(/pdf/) || line_info[0].match(/tiff/)) {
            console.log('Found file: ' + line_info[3]);

            if (line_info[3].match(/\;/)) {
                faxfiles[file_cnt] = line_info[3];
                file_cnt++;
            }
        }
    }
});

if (!to_company) {
    to_company = external;
}

var cid;
var addressbook = new AFAddressBook();

// lookup database entry for this fax number
addressbook.loadbyfaxnum(external)
    .then( (res) => {
        if (res.mult) {
            cid = 0;
            func.faxlog('notify> Found fax number with multiple companies', true);
        } else {
            cid = addressbook.get_companyid();
            addressbook.inc_faxto();    // increment faxto count
        }
    }, (err) => {   // if it doesn't exist, create it
        addressbook.create(to_company)
            .then( () => {
                addressbook.create_faxnumid(external)
                    .then( () => {
                        // set to_location, to_voice, to_person
                        addressbook.save_settings({
                            'description': null,
                            'faxcatid': null,
                            'to_person': to_person,
                            'to_location': to_location,
                            'to_voice': to_voice
                        });

                        cid = addressbook.get_companyid();
                        addressbook.inc_faxto();    // increment faxto count
                        func.faxlog(`notify> Created company '${external}' with cid '${cid}'`, true);
                    }, () => {  // Failed to create faxnumid
                        cid = 0;
                        func.faxlog("notify> Failed to create faxnumid for '"+external+"' - "+addressbook.get_error(), true);
                    });
            }, () => {  // Failed to create company
                cid = 0;
                func.faxlog("notify> Failed to create company '"+external+"' - "+addressbook.get_error(), true);
            });
    });