#!/usr/bin/env node
import { loadSystem, originBanner } from '../../packages/core/index.js';
import { listProjects, getProject } from '../../packages/registry/index.js';

const [command = 'origin', arg] = process.argv.slice(2);

function printStatus() {
  const system = loadSystem();
  const projects = listProjects();
  console.log(originBanner());
  console.log(`Status: ${system.status}`);
  console.log(`Mission: ${system.mission}`);
  console.log(`Divisions: ${system.divisions.length}`);
  console.log(`Registered projects: ${projects.length}`);
}

function printOrigin() {
  const system = loadSystem();
  console.log(`${originBanner()} INITIALIZED`);
  console.log(system.mission);
  console.log('\nCommands: origin, status, divisions, projects, project <id>, prime');
}

switch (command.toLowerCase()) {
  case 'origin':
    printOrigin();
    break;
  case 'status':
    printStatus();
    break;
  case 'divisions':
    loadSystem().divisions.forEach((division) => console.log(`- ${division}`));
    break;
  case 'projects':
    listProjects().forEach((project) => console.log(`${project.id}\t${project.name}\t${project.status}`));
    break;
  case 'project': {
    const project = getProject(arg);
    if (!project) {
      console.error(`Unknown project: ${arg ?? '(missing id)'}`);
      process.exitCode = 1;
      break;
    }
    console.log(JSON.stringify(project, null, 2));
    break;
  }
  case 'prime':
    console.log('NEO PRIME: system-level orchestration mode selected.');
    break;
  default:
    console.error(`Unknown command: ${command}`);
    process.exitCode = 1;
}
