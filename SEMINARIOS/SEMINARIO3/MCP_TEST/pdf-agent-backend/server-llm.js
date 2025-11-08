const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { UniversalAIClient, AI_PROVIDERS } = require('./ai-providers');
const { FileManager } = require('./file-manager');
const { TemplateGenerator } = require('./template-generator');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Inicializar gestores de archivos y plantillas
const fileManager = new FileManager([
  path.join(process.cwd(), 'generated-files'),
  path.join(process.cwd(), 'pdf-outputs'),
  path.join(process.cwd(), 'user-files')
]);
const templateGenerator = new TemplateGenerator();

// Inicializar cliente de IA - intentar múltiples proveedores
let aiClient = null;
let activeProvider = 'demo';

async function initializeAIClient() {
  // Intenta con Groq (gratuito, no requiere configuración local)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    aiClient = new UniversalAIClient('groq', groqKey);
    activeProvider = 'groq';
    console.log('✅ Groq configurado como proveedor de IA');
    return;
  }

  // Intenta con DeepSeek
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (deepseekKey) {
    aiClient = new UniversalAIClient('deepseek', deepseekKey);
    activeProvider = 'deepseek';
    console.log('✅ DeepSeek configurado como proveedor de IA');
    return;
  }

  // Intenta con OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    aiClient = new UniversalAIClient('openai', openaiKey);
    activeProvider = 'openai';
    console.log('✅ OpenAI configurado como proveedor de IA');
    return;
  }

  // Intenta con Ollama local (opcional)
  try {
    const testResponse = await fetch('http://localhost:11434/api/tags');
    if (testResponse.ok) {
      aiClient = new UniversalAIClient('ollama', '');
      activeProvider = 'ollama';
      console.log('✅ Ollama detectado y configurado como proveedor de IA');
      return;
    }
  } catch (e) {
    // Ollama no está disponible
  }

  // Usar modo demo si no hay proveedores configurados
  aiClient = new UniversalAIClient('demo', '');
  activeProvider = 'demo';
  console.log('⚠️ Ningún proveedor LLM disponible, usando modo DEMO');
}

// Análisis inteligente sin IA externa
function analyzeContentIntelligently(text, query) {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Dividir el texto en secciones por páginas, párrafos y oraciones
  const pages = text.split(/=== PÁGINA \d+ ===/);
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  // Palabras clave de la consulta
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  // Encontrar contenido relevante
  const relevantContent = [];
  
  // Buscar en oraciones
  sentences.forEach(sentence => {
    const sentenceLower = sentence.toLowerCase();
    const matches = queryWords.filter(word => sentenceLower.includes(word));
    if (matches.length > 0) {
      relevantContent.push({
        type: 'sentence',
        content: sentence.trim(),
        relevance: matches.length,
        matches: matches
      });
    }
  });
  
  // Buscar en párrafos para contexto más amplio
  paragraphs.forEach(paragraph => {
    const paragraphLower = paragraph.toLowerCase();
    const matches = queryWords.filter(word => paragraphLower.includes(word));
    if (matches.length >= 2) {
      relevantContent.push({
        type: 'paragraph',
        content: paragraph.trim().substring(0, 300) + (paragraph.length > 300 ? '...' : ''),
        relevance: matches.length,
        matches: matches
      });
    }
  });
  
  // Ordenar por relevancia
  relevantContent.sort((a, b) => b.relevance - a.relevance);
  
  // Análisis específico según el tipo de pregunta
  let specificAnalysis = '';
  
  if (queryLower.includes('tema') || queryLower.includes('trata') || queryLower.includes('principal')) {
    const wordFreq = {};
    const words = textLower.split(/\s+/).filter(w => w.length > 4);
    words.forEach(word => wordFreq[word] = (wordFreq[word] || 0) + 1);
    
    const topWords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([word, count]) => `${word} (${count} veces)`);
      
    specificAnalysis = `\n🎯 **ANÁLISIS TEMÁTICO:**\nPalabras más frecuentes: ${topWords.join(', ')}\n\nEl documento se centra principalmente en estos conceptos clave.`;
  }
  
  if (queryLower.includes('resumen') || queryLower.includes('resume') || queryLower.includes('importante')) {
    const keyParagraphs = paragraphs
      .filter(p => p.length > 100)
      .sort((a, b) => b.length - a.length)
      .slice(0, 3);
      
    specificAnalysis = `\n📋 **RESUMEN INTELIGENTE:**\n` + 
      keyParagraphs.map((p, i) => `${i+1}. ${p.substring(0, 200)}...`).join('\n\n');
  }
  
  if (queryLower.includes('número') || queryLower.includes('dato') || queryLower.includes('métrica') || queryLower.includes('estadística')) {
    const numbers = text.match(/\d+(?:[.,]\d+)*\s*%?/g) || [];
    const dates = text.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g) || [];
    const percentages = text.match(/\d+(?:[.,]\d+)*\s*%/g) || [];
    
    specificAnalysis = `\n📊 **DATOS NUMÉRICOS ENCONTRADOS:**\n` +
      `• Números: ${[...new Set(numbers)].slice(0, 10).join(', ')}\n` +
      `• Porcentajes: ${[...new Set(percentages)].join(', ')}\n` +
      `• Fechas: ${[...new Set(dates)].join(', ')}`;
  }
  
  if (queryLower.includes('metodología') || queryLower.includes('método') || queryLower.includes('proceso')) {
    const methodSections = paragraphs.filter(p => {
      const pLower = p.toLowerCase();
      return pLower.includes('método') || pLower.includes('proceso') || 
             pLower.includes('técnica') || pLower.includes('enfoque') ||
             pLower.includes('procedimiento') || pLower.includes('estrategia');
    });
    
    specificAnalysis = `\n🔬 **ANÁLISIS METODOLÓGICO:**\n` + 
      methodSections.slice(0, 2).map((s, i) => `${i+1}. ${s.substring(0, 250)}...`).join('\n\n');
  }
  
  return {
    relevantContent: relevantContent.slice(0, 5),
    specificAnalysis,
    stats: {
      totalPages: pages.length - 1,
      totalParagraphs: paragraphs.length,
      totalSentences: sentences.length,
      matchesFound: relevantContent.length
    }
  };
}

// Endpoint principal para análisis con LLM
app.post('/api/analyze-real', async (req, res) => {
  try {
    const { pdfContent, userMessage, useAI = true } = req.body;

    if (!pdfContent || !userMessage) {
      return res.status(400).json({ 
        error: 'Se requiere contenido del PDF y mensaje del usuario' 
      });
    }

    console.log(`🔍 Analizando consulta: "${userMessage}"`);
    console.log(`📄 Contenido recibido: ${pdfContent.length} caracteres`);

    // Realizar análisis inteligente local
    const intelligentAnalysis = analyzeContentIntelligently(pdfContent, userMessage);

    let response = `🔍 **ANÁLISIS DEL DOCUMENTO**

**Consulta:** "${userMessage}"
**Documento:** ${intelligentAnalysis.stats.totalPages} páginas, ${intelligentAnalysis.stats.totalParagraphs} párrafos

`;

    // Mostrar contenido relevante encontrado
    if (intelligentAnalysis.relevantContent.length > 0) {
      response += `📄 **CONTENIDO ESPECÍFICO ENCONTRADO:**\n\n`;
      intelligentAnalysis.relevantContent.forEach((item, index) => {
        response += `**${index + 1}.** ${item.content}\n`;
        response += `   *[Coincidencias: ${item.matches.join(', ')}]*\n\n`;
      });
    } else {
      response += `❌ No se encontró contenido específicamente relacionado con "${userMessage}" en el documento.\n\n`;
    }

    // Agregar análisis específico
    response += intelligentAnalysis.specificAnalysis;

    // Si se solicita análisis con IA
    if (useAI && aiClient) {
      try {
        console.log(`🤖 Llamando a ${activeProvider} para análisis adicional...`);
        
        const messages = [
          {
            role: 'system',
            content: 'Eres un asistente experto en análisis de documentos. Proporciona respuestas específicas y detalladas basadas en el contenido proporcionado.'
          },
          {
            role: 'user',
            content: `Analiza este contenido del PDF y responde la pregunta del usuario de manera específica y detallada.

CONTENIDO DEL DOCUMENTO:
${pdfContent.substring(0, 3000)}... (contenido truncado para análisis)

PREGUNTA DEL USUARIO: ${userMessage}

Por favor, proporciona una respuesta específica basada únicamente en el contenido del documento proporcionado. Si no encuentras información relevante, menciona que la información no está disponible en el texto proporcionado.`
          }
        ];

        const aiResponse = await aiClient.generateResponse(messages);
        
        // Validar que tenemos respuesta válida
        if (aiResponse && aiResponse.content && aiResponse.content.trim() !== '') {
          response += `\n\n🤖 **ANÁLISIS ADICIONAL CON IA (${activeProvider.toUpperCase()}):**\n\n${aiResponse.content}`;
          
          if (aiResponse.usage) {
            console.log(`📊 Tokens utilizados: ${JSON.stringify(aiResponse.usage)}`);
          }
        } else {
          console.warn('⚠️ Respuesta vacía o inválida del LLM');
          throw new Error('Respuesta vacía del LLM');
        }
        
      } catch (error) {
        console.error(`⚠️ Error con ${activeProvider}:`, error.message);
        response += `\n\n⚠️ **Análisis de IA no disponible:** ${error.message}\n\n💡 **Para habilitar IA con análisis más profundo:**\n`;
        
        if (activeProvider === 'demo') {
          response += `1. **Groq (GRATIS):** https://console.groq.com - obtén tu API key\n`;
          response += `2. **DeepSeek (95% más barato):** https://platform.deepseek.com\n`;
          response += `3. **Ollama (100% local y gratis):** https://ollama.ai - ejecuta: ollama serve\n`;
          response += `4. **Hugging Face (gratis):** https://huggingface.co/settings/tokens\n\n`;
          response += `Luego establece las variables de entorno en tu .env file.`;
        }
      }
    } else if (!useAI) {
      response += `\n\n💡 **Análisis de IA deshabilitado.** Para habilitar análisis con IA, configura un proveedor.`;
    }

    response += `\n\n---
✅ **Análisis completado**
📊 **Estadísticas:** ${intelligentAnalysis.stats.matchesFound} coincidencias encontradas
🔍 **Método:** Análisis inteligente del contenido real${useAI && aiClient ? ` + IA (${activeProvider.toUpperCase()})` : ''}
⚙️ **Proveedor activo:** ${activeProvider.toUpperCase()}`;

    return res.json({
      response,
      analysis: intelligentAnalysis,
      aiProvider: activeProvider,
      aiAvailable: aiClient !== null,
      stats: intelligentAnalysis.stats
    });

  } catch (error) {
    console.error('Error en análisis:', error);
    
    return res.status(500).json({
      response: `❌ **Error en el análisis:** ${error.message}

🔧 **Solución:** El sistema de análisis inteligente está disponible sin dependencias externas. Si hay problemas, verifica que el contenido del PDF sea válido.`,
      error: error.message
    });
  }
});

// Endpoint para verificar estado de proveedores
app.get('/api/ai-status', async (req, res) => {
  const providers = {
    active: activeProvider,
    available: {},
    available_setup: []
  };

  // Verificar Groq
  if (process.env.GROQ_API_KEY) {
    providers.available.groq = { configured: true, model: 'llama-3.1-70b-versatile' };
  } else {
    providers.available_setup.push({
      provider: 'Groq',
      setup: 'Obtén API key en https://console.groq.com',
      env_var: 'GROQ_API_KEY',
      cost: 'GRATIS (6K tokens/minuto)'
    });
  }

  // Verificar DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    providers.available.deepseek = { configured: true, model: 'deepseek-chat' };
  } else {
    providers.available_setup.push({
      provider: 'DeepSeek',
      setup: 'Obtén API key en https://platform.deepseek.com',
      env_var: 'DEEPSEEK_API_KEY',
      cost: '95% más barato que GPT-4'
    });
  }

  // Verificar OpenAI
  if (process.env.OPENAI_API_KEY) {
    providers.available.openai = { configured: true, model: 'gpt-4o-mini' };
  } else {
    providers.available_setup.push({
      provider: 'OpenAI',
      setup: 'Obtén API key en https://platform.openai.com',
      env_var: 'OPENAI_API_KEY',
      cost: 'De pago'
    });
  }

  // Verificar Ollama
  try {
    const testResponse = await fetch('http://localhost:11434/api/tags');
    if (testResponse.ok) {
      providers.available.ollama = { configured: true, model: 'llama3.1:8b' };
    }
  } catch (e) {
    providers.available_setup.push({
      provider: 'Ollama',
      setup: 'Instala desde https://ollama.ai y ejecuta: ollama serve',
      env_var: 'none',
      cost: '100% GRATIS (local)'
    });
  }

  res.json({
    status: 'Proveedores de IA',
    activeProvider: activeProvider,
    message: activeProvider === 'demo' 
      ? '⚠️ Ningún proveedor configurado, usando modo DEMO' 
      : `✅ ${activeProvider.toUpperCase()} está activo`,
    providers,
    setup_instructions: providers.available_setup
  });
});

// ============================================
// ENDPOINTS PARA GESTIÓN DE ARCHIVOS
// ============================================

// Analizar PDF y sugerir archivos a crear
app.post('/api/suggest-files', async (req, res) => {
  try {
    const { pdfContent, userQuery = '' } = req.body;

    if (!pdfContent) {
      return res.status(400).json({ error: 'Se requiere contenido del PDF' });
    }

    console.log(`📋 Analizando contenido para sugerir archivos...`);

    // Realizar análisis inteligente
    const analysis = analyzeContentIntelligently(pdfContent, userQuery);
    
    // Sugerir plantillas apropiadas
    const suggestions = templateGenerator.analyzeAndSuggestTemplates(pdfContent, userQuery);

    const response = {
      success: true,
      suggestions: suggestions.map(suggestion => ({
        ...suggestion,
        estimatedSize: `~${Math.round(pdfContent.length * 0.3)} caracteres`,
        category: getCategoryFromTemplate(suggestion.key)
      })),
      analysis: {
        totalSuggestions: suggestions.length,
        topSuggestion: suggestions[0]?.name || 'Sin sugerencias específicas',
        contentAnalysis: analysis
      },
      availableTemplates: Object.keys(templateGenerator.templates).map(key => ({
        key,
        name: templateGenerator.templates[key].name,
        extension: templateGenerator.templates[key].extension
      }))
    };

    res.json(response);

  } catch (error) {
    console.error('Error sugiriendo archivos:', error);
    res.status(500).json({
      error: error.message,
      suggestions: [],
      message: 'Error al analizar contenido para sugerencias'
    });
  }
});

// Crear archivo específico basado en plantilla
app.post('/api/create-file', async (req, res) => {
  try {
    const { pdfContent, templateKey, fileName, userQuery = '', customContent = null } = req.body;

    if (!pdfContent || !templateKey) {
      return res.status(400).json({ 
        error: 'Se requiere contenido del PDF y clave de plantilla' 
      });
    }

    console.log(`📄 Creando archivo con plantilla: ${templateKey}`);

    // Realizar análisis del contenido
    const analysis = analyzeContentIntelligently(pdfContent, userQuery);

    // Generar contenido del archivo
    let fileResult;
    if (customContent || templateKey === 'custom') {
      // Usar contenido personalizado
      fileResult = {
        fileName: fileName || `custom_${Date.now()}.txt`,
        content: customContent || `Archivo creado el ${new Date().toLocaleString()}\n\nContenido basado en: ${userQuery}`,
        template: 'Personalizado',
        size: (customContent || '').length
      };
    } else {
      // Generar usando plantilla
      fileResult = await templateGenerator.generateFile(templateKey, pdfContent, analysis, { fileName });
    }

    // Crear el archivo físicamente
    const filePath = path.join(fileManager.allowedDirectories[0], fileResult.fileName);
    const fileInfo = await fileManager.writeFile(filePath, fileResult.content);

    res.json({
      success: true,
      file: {
        name: fileResult.fileName,
        path: filePath,
        size: fileInfo.size,
        template: fileResult.template,
        created: fileInfo.created
      },
      preview: fileResult.content.substring(0, 500) + (fileResult.content.length > 500 ? '\n...' : ''),
      message: `✅ Archivo creado exitosamente: ${fileResult.fileName}`,
      downloadUrl: `/api/download/${encodeURIComponent(fileResult.fileName)}`
    });

  } catch (error) {
    console.error('Error creando archivo:', error);
    res.status(500).json({
      error: error.message,
      message: 'Error al crear archivo'
    });
  }
});

// Crear múltiples archivos automáticamente
app.post('/api/create-batch-files', async (req, res) => {
  try {
    const { pdfContent, templates = [], userQuery = '' } = req.body;

    if (!pdfContent || templates.length === 0) {
      return res.status(400).json({ 
        error: 'Se requiere contenido del PDF y al menos una plantilla' 
      });
    }

    console.log(`📂 Creando ${templates.length} archivos en lote...`);

    const analysis = analyzeContentIntelligently(pdfContent, userQuery);
    const results = [];
    const errors = [];

    // Crear directorio específico para este lote
    const batchDir = path.join(fileManager.allowedDirectories[0], `batch_${Date.now()}`);
    await fileManager.createDirectory(batchDir);

    for (const templateKey of templates) {
      try {
        const fileResult = await templateGenerator.generateFile(templateKey, pdfContent, analysis);
        const filePath = path.join(batchDir, fileResult.fileName);
        const fileInfo = await fileManager.writeFile(filePath, fileResult.content);

        results.push({
          template: templateKey,
          fileName: fileResult.fileName,
          path: filePath,
          size: fileInfo.size,
          status: 'created'
        });
      } catch (error) {
        errors.push({
          template: templateKey,
          error: error.message,
          status: 'failed'
        });
      }
    }

    res.json({
      success: results.length > 0,
      batchDirectory: batchDir,
      results,
      errors,
      summary: {
        total: templates.length,
        created: results.length,
        failed: errors.length
      },
      message: `Lote completado: ${results.length} archivos creados, ${errors.length} fallos`
    });

  } catch (error) {
    console.error('Error en creación por lotes:', error);
    res.status(500).json({
      error: error.message,
      message: 'Error al crear archivos por lotes'
    });
  }
});

// Listar archivos generados
app.get('/api/list-files', async (req, res) => {
  try {
    const { directory = 0 } = req.query;
    const targetDir = fileManager.allowedDirectories[directory] || fileManager.allowedDirectories[0];

    const listing = await fileManager.listDirectory(targetDir);
    
    res.json({
      success: true,
      directory: targetDir,
      files: listing.contents.map(item => ({
        name: item.name,
        type: item.type,
        size: item.size,
        modified: item.modified,
        downloadUrl: item.type === 'file' ? `/api/download/${encodeURIComponent(item.name)}` : null
      })),
      totalFiles: listing.contents.filter(item => item.type === 'file').length,
      totalDirectories: listing.contents.filter(item => item.type === 'directory').length
    });

  } catch (error) {
    console.error('Error listando archivos:', error);
    res.status(500).json({
      error: error.message,
      files: []
    });
  }
});

// Descargar archivo generado
app.get('/api/download/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const decodedFileName = decodeURIComponent(fileName);
    
    // Buscar archivo en directorios permitidos
    let filePath = null;
    for (const dir of fileManager.allowedDirectories) {
      const testPath = path.join(dir, decodedFileName);
      try {
        await fileManager.getFileInfo(testPath);
        filePath = testPath;
        break;
      } catch (e) {
        // Archivo no encontrado en este directorio
      }
    }

    if (!filePath) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const fileData = await fileManager.readFile(filePath);
    
    res.setHeader('Content-Disposition', `attachment; filename="${decodedFileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(fileData.content);

  } catch (error) {
    console.error('Error descargando archivo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener información de un archivo específico
app.get('/api/file-info/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const decodedFileName = decodeURIComponent(fileName);
    
    // Buscar archivo en directorios permitidos
    let fileInfo = null;
    for (const dir of fileManager.allowedDirectories) {
      const testPath = path.join(dir, decodedFileName);
      try {
        fileInfo = await fileManager.getFileInfo(testPath);
        break;
      } catch (e) {
        // Archivo no encontrado en este directorio
      }
    }

    if (!fileInfo) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.json({
      success: true,
      file: fileInfo,
      downloadUrl: `/api/download/${encodeURIComponent(fileName)}`
    });

  } catch (error) {
    console.error('Error obteniendo información:', error);
    res.status(500).json({ error: error.message });
  }
});

// Editar archivo existente
app.post('/api/edit-file', async (req, res) => {
  try {
    const { fileName, edits, dryRun = false } = req.body;

    if (!fileName || !edits || !Array.isArray(edits)) {
      return res.status(400).json({ 
        error: 'Se requiere nombre de archivo y array de ediciones' 
      });
    }

    // Buscar archivo en directorios permitidos
    let filePath = null;
    for (const dir of fileManager.allowedDirectories) {
      const testPath = path.join(dir, fileName);
      try {
        await fileManager.getFileInfo(testPath);
        filePath = testPath;
        break;
      } catch (e) {
        // Archivo no encontrado en este directorio
      }
    }

    if (!filePath) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const result = await fileManager.editFile(filePath, edits, { dryRun });
    
    res.json({
      success: true,
      fileName,
      dryRun,
      result,
      message: dryRun ? 'Vista previa de cambios' : `Archivo editado: ${result.editsApplied} cambios aplicados`
    });

  } catch (error) {
    console.error('Error editando archivo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear directorio específico
app.post('/api/create-directory', async (req, res) => {
  try {
    const { directoryName } = req.body;

    if (!directoryName) {
      return res.status(400).json({ 
        error: 'Se requiere nombre del directorio' 
      });
    }

    console.log(`📁 Creando directorio: ${directoryName}`);

    // Crear directorio en el path de archivos generados
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedName = directoryName.replace(/[^a-zA-Z0-9\-_]/g, '').toLowerCase();
    const finalDirName = `${sanitizedName}_${timestamp}`;
    const dirPath = path.join(fileManager.allowedDirectories[0], finalDirName);

    const result = await fileManager.createDirectory(dirPath);
    
    res.json({
      success: true,
      directoryName: finalDirName,
      path: dirPath,
      message: `✅ Directorio creado: ${finalDirName}`,
      result
    });

  } catch (error) {
    console.error('Error creando directorio:', error);
    res.status(500).json({
      error: error.message,
      message: 'Error al crear directorio'
    });
  }
});

// Obtener directorios permitidos
app.get('/api/directories', (req, res) => {
  try {
    const directories = fileManager.getAllowedDirectories();
    res.json({
      success: true,
      directories,
      message: 'Directorios de trabajo disponibles'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Función auxiliar para categorizar plantillas
function getCategoryFromTemplate(templateKey) {
  const categories = {
    code_guide: 'Programación',
    summary: 'Documentación',
    technical_doc: 'Técnico',
    data_analysis: 'Análisis',
    methodology: 'Proceso',
    source_code: 'Código',
    checklist: 'Organización',
    configuration: 'Configuración'
  };
  return categories[templateKey] || 'General';
}

// Endpoint de estado
app.get('/api/status', (req, res) => {
  res.json({
    server: 'PDF2Agent Real Analysis + File Generation',
    status: 'online',
    timestamp: new Date().toISOString(),
    aiProvider: activeProvider,
    features: {
      intelligent_analysis: true,
      pdf_text_extraction: 'client-side',
      llm_analysis: aiClient !== null,
      real_time_analysis: true,
      file_generation: true,
      template_system: true,
      batch_processing: true,
      file_management: true
    },
    fileSystem: {
      allowedDirectories: fileManager.allowedDirectories.length,
      availableTemplates: Object.keys(templateGenerator.templates).length,
      supportedOperations: ['create', 'read', 'edit', 'list', 'download']
    },
    message: `🚀 Servidor listo para análisis real de PDFs y generación de archivos (${activeProvider.toUpperCase()})`
  });
});

// Inicializar y levantar servidor
async function startServer() {
  await initializeAIClient();

  app.listen(PORT, () => {
    console.log(`\n🚀 PDF2Agent Real Analysis + File Generation corriendo en http://localhost:${PORT}`);
    console.log(`🔍 Características:`);
    console.log(`   • Análisis inteligente del contenido real`);
    console.log(`   • Extracción de texto con PDF.js`);
    console.log(`   • Soporte para múltiples proveedores de LLM`);
    console.log(`   • Análisis contextual avanzado`);
    console.log(`   • Sistema de plantillas para archivos`);
    console.log(`   • Creación automática de documentos`);
    console.log(`   • Gestión completa de archivos`);
    console.log(`   • Proveedor activo: ${activeProvider.toUpperCase()}`);
    console.log(`\n💡 Endpoints de análisis:`);
    console.log(`   • POST /api/analyze-real - Analizar PDF`);
    console.log(`   • GET /api/ai-status - Ver status de proveedores`);
    console.log(`\n📁 Endpoints de archivos:`);
    console.log(`   • POST /api/suggest-files - Sugerir archivos a crear`);
    console.log(`   • POST /api/create-file - Crear archivo específico`);
    console.log(`   • POST /api/create-batch-files - Crear múltiples archivos`);
    console.log(`   • POST /api/create-directory - Crear directorio/carpeta`);
    console.log(`   • GET /api/list-files - Listar archivos generados`);
    console.log(`   • GET /api/download/:fileName - Descargar archivo`);
    console.log(`   • POST /api/edit-file - Editar archivo existente`);
    console.log(`   • GET /api/directories - Ver directorios de trabajo`);
    console.log(`   • GET /api/status - Ver status completo del servidor`);
    console.log(`\n📂 Directorios de trabajo:`);
    fileManager.allowedDirectories.forEach(dir => {
      console.log(`   • ${dir}`);
    });
    console.log(`\n🎨 Plantillas disponibles: ${Object.keys(templateGenerator.templates).length}`);
    console.log(`   • ${Object.values(templateGenerator.templates).map(t => t.name).join(', ')}\n`);
  });
}

startServer().catch(error => {
  console.error('Error al iniciar servidor:', error);
  process.exit(1);
});
