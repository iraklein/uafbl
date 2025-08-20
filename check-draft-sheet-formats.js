const XLSX = require('xlsx');

function checkDraftSheetFormats() {
  console.log('Checking format of all draft sheets...\n');

  const workbook = XLSX.readFile('UAFBL Franchise Record.xlsx');
  
  const draftSheets = workbook.SheetNames.filter(name => 
    /^\d{4}\s+Draft\s+Sheet$/.test(name)
  ).sort();

  draftSheets.forEach(sheetName => {
    const year = parseInt(sheetName.split(' ')[0]);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log(`=== ${year} Draft Sheet ===`);
    console.log(`Rows: ${data.length}`);
    console.log(`Headers:`, data[0]);
    
    if (data.length > 1) {
      console.log(`Sample row 2:`, data[1]);
    }
    if (data.length > 2) {
      console.log(`Sample row 3:`, data[2]);
    }
    
    console.log('');
  });
}

checkDraftSheetFormats();