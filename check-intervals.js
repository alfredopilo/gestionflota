const ExcelJS = require('exceljs');

async function checkIntervals() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('C:\\Cursorcode\\Gestiondeflota\\docs\\AnexoActividadesVS$VHT.xlsx');

  const worksheet = workbook.worksheets[0];
  
  console.log('\n=== VERIFICANDO INTERVALOS ===\n');
  
  const row1 = worksheet.getRow(1); // Horas
  const row2 = worksheet.getRow(2); // Kilómetros
  
  console.log('Buscando intervalos en todas las columnas...\n');
  
  let intervalCount = 0;
  
  // Buscar en un rango más amplio (hasta columna 20)
  for (let col = 1; col <= 20; col++) {
    const hoursCell = row1.getCell(col);
    const kmCell = row2.getCell(col);
    
    const hoursText = String(hoursCell.text || hoursCell.value || '').trim();
    const kmText = String(kmCell.text || kmCell.value || '').trim();
    
    if (hoursText || kmText) {
      const colLetter = String.fromCharCode(64 + col); // A=65, B=66, etc.
      console.log(`Columna ${colLetter} (${col}):`);
      console.log(`  Horas: ${hoursText}`);
      console.log(`  Km: ${kmText}`);
      
      // Verificar si contiene números
      const hoursMatch = hoursText.match(/([\d.,]+)/);
      const kmMatch = kmText.match(/([\d.,]+)/);
      
      if (hoursMatch && kmMatch) {
        intervalCount++;
        console.log(`  ✓ INTERVALO ${intervalCount} VÁLIDO`);
      } else {
        console.log(`  ✗ No válido (no contiene números)`);
      }
      console.log('');
    }
  }
  
  console.log(`\n=== TOTAL DE INTERVALOS VÁLIDOS: ${intervalCount} ===\n`);
}

checkIntervals().catch(console.error);
