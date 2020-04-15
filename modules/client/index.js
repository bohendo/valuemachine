const fs = require('fs'); 

fs.readFile('./data/chain-data.json', (err, data) => {

  console.log('Hello');
  console.log(JSON.parse(data))
})
