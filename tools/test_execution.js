const path = require('path');
const serverNodeModules = path.join(__dirname, '../server/node_modules');
module.paths.push(serverNodeModules);

const { executeCode } = require('../server/execute');

async function testExecution() {
  console.log('Testing Python Code Execution...');
  const pyResult = await executeCode('python', 'print("Hello from SynapseCode Python!")', false);
  console.log('Python Output:', pyResult);

  console.log('\nTesting JavaScript Code Execution...');
  const jsResult = await executeCode('javascript', 'console.log("Hello from SynapseCode JavaScript!")', false);
  console.log('JavaScript Output:', jsResult);
}

testExecution();
