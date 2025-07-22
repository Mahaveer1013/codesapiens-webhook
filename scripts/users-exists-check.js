// check_github_and_generate.js
require('dotenv').config();
const fs = require('fs');
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const usernames = [
  'SanjayKumar-hub','vishal-maddy','sivadhasan','Prasanna-Nadrajan',
  'SUBASH-R-007','MeerNadeemudeen-rec','Vsreecharan','nirranjansai',
  'Vishnuvarman007','Karthickbalaji5','Karthih2','Kabelbas',
  'sreeladchayaa','Shivaniibhala','Srivinkumar','Sowmyalakshmi15',
  'TanushriBalaji','Soameshwaran','rahulsags','Brijith58',
  'Keekee0207','Praveenredm','RevanthkumarSathiasilane',
  'SIDDHU-23052006','aasif-10','Dev-solder124','harinaath7777',
  'shallini-16','ClassyMuhi','sivaram7025','adikesavan',
  'Balaji-9941','gogula0705','Harikumar4','kapileshn',
  'Vishalraaj5','ArghoDutta','Jayanta2004','SubarnoSingh',
  'Mahalakshmi-0205','Vishva-05','Harini-narayanasamy'
];

async function main() {
  const checked = [];
  for (const u of usernames) {
    try {
      await octokit.users.getByUsername({ username: u });
      checked.push(u);
      console.log(`✅ Found: ${u}`);
    } catch (e) {
      console.warn(`❌ Not found: ${u}`);
    }
  }

  const repos = [];
  const teamSize = 3;
  for (let i = 0; i < checked.length; i += teamSize) {
    const group = checked.slice(i, i + teamSize);
    repos.push({
      name: `git-in-kadhai-${String(repos.length + 1).padStart(3, '0')}`,
      collaborators: group,
    });
  }

  fs.writeFileSync('repositories.json', 'export const repositories = ' + JSON.stringify(repos, null, 2) + ';');
  console.log('✅ Generated repositories.json');
}

main().catch(console.error);
