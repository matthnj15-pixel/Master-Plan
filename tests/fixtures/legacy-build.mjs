import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

// These fixtures protect the original planning path. Set the build flag before
// engine initialization, without an early localStorage write during navigation.
// The composition suites exercise the normal Dev default separately.
export function legacyPlanningFixture(directory){
  for(const name of ['index.html','master-plan.html']){
    const path=join(directory,name),html=readFileSync(path,'utf8');
    writeFileSync(path,html.replace(/var MP_BUILD=(\{[^\n]*\});\n/,(_match,json)=>{
      const build=JSON.parse(json);build.flags.compositionPlans=false;
      return 'var MP_BUILD='+JSON.stringify(build)+';\n';
    }));
  }
}
