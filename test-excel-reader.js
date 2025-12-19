const ExcelJS = require('exceljs');

async function testExcel() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('C:\\Cursorcode\\Gestiondeflota\\docs\\AnexoActividadesVS$VHT.xlsx');

  console.log('\n=== HOJAS DISPONIBLES ===');
  workbook.worksheets.forEach((ws, idx) => {
    console.log(`Hoja ${idx}: "${ws.name}" (${ws.rowCount} filas)`);
  });

  // Buscar la hoja correcta
  let worksheet = workbook.getWorksheet('AnexoActividadesVS$VHT');
  if (!worksheet) {
    worksheet = workbook.worksheets.find((ws) =>
      ws.name.toLowerCase().includes('anexo') || ws.name.toLowerCase().includes('actividades'),
    );
  }
  if (!worksheet) {
    worksheet = workbook.worksheets[0];
  }

  console.log(`\n=== USANDO HOJA: "${worksheet.name}" ===\n`);

  // Mostrar las primeras 15 filas para entender la estructura
  console.log('=== ESTRUCTURA DEL ARCHIVO (primeras 15 filas) ===\n');
  
  for (let row = 1; row <= Math.min(15, worksheet.rowCount); row++) {
    const rowData = worksheet.getRow(row);
    const values = [];
    
    for (let col = 1; col <= 12; col++) {
      const cell = rowData.getCell(col);
      let value = cell.text || cell.value || '';
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      value = String(value).substring(0, 30); // Limitar a 30 caracteres
      values.push(value.padEnd(32));
    }
    
    console.log(`Fila ${String(row).padStart(2)}: ${values.join(' | ')}`);
  }

  // Intentar leer intervalos desde diferentes filas
  console.log('\n\n=== BUSCANDO INTERVALOS ===\n');
  
  for (let testRow = 1; testRow <= 15; testRow++) {
    const rowData = worksheet.getRow(testRow);
    let hasHoras = false;
    let hasKm = false;
    
    for (let col = 1; col <= 12; col++) {
      const cell = rowData.getCell(col);
      const text = String(cell.text || cell.value || '').toLowerCase();
      
      if (text.includes('hora')) hasHoras = true;
      if (text.includes('kil') || text.includes('km')) hasKm = true;
    }
    
    if (hasHoras || hasKm) {
      console.log(`Fila ${testRow}: Horas=${hasHoras}, Kilómetros=${hasKm}`);
      
      // Mostrar valores de columnas C-L (3-12)
      const values = [];
      for (let col = 3; col <= 12; col++) {
        const cell = rowData.getCell(col);
        values.push(cell.text || cell.value || '');
      }
      console.log(`  Valores (C-L): ${values.join(' | ')}`);
    }
  }

  // Buscar actividades
  console.log('\n\n=== PRIMERAS ACTIVIDADES (desde fila 10) ===\n');
  
  for (let row = 10; row <= Math.min(25, worksheet.rowCount); row++) {
    const rowData = worksheet.getRow(row);
    const codeCell = rowData.getCell(1);
    const descCell = rowData.getCell(2);
    
    const code = codeCell.text?.trim() || codeCell.value?.toString().trim() || '';
    const desc = descCell.text?.trim() || descCell.value?.toString().trim() || '';
    
    if (code || desc) {
      console.log(`Fila ${row}: Código="${code}" | Descripción="${desc}"`);
      
      // Mostrar marcas en columnas C-L
      const marks = [];
      for (let col = 3; col <= 12; col++) {
        const cell = rowData.getCell(col);
        const value = cell.text?.trim() || cell.value?.toString().trim() || '';
        marks.push(value || '-');
      }
      console.log(`  Marcas: ${marks.join(' | ')}`);
    }
  }
}

testExcel().catch(console.error);
