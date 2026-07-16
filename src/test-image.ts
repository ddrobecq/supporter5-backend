import { getEntityImage } from './lib/imageService';

async function testImage() {
  console.log('\n=== TEST IMAGE API ===\n');

  // Récupérer le premier arbitre
  const result = await getEntityImage('arbitre', '0001');

  if (!result) {
    console.log('❌ Aucune image trouvée pour arbitre 0001');
  } else {
    console.log('✅ Image trouvée');
    console.log(`   - Taille: ${result.buffer.length} bytes`);
    console.log(`   - MIME: ${result.mimeType}`);
    console.log(`   - Premiers bytes (hex): ${result.buffer.slice(0, 20).toString('hex')}`);
    
    // Vérifier le format
    if (result.buffer.slice(0, 2).toString('hex') === '424d') {
      console.log('   ✓ Format détecté: BMP (424d = "BM")');
    } else if (result.buffer.slice(0, 3).toString('hex') === 'ffd8ff') {
      console.log('   ✓ Format détecté: JPEG (ffd8ff)');
    } else {
      console.log(`   ? Format inconnu: ${result.buffer.slice(0, 4).toString('hex')}`);
    }
  }
}

testImage().catch(console.error);
