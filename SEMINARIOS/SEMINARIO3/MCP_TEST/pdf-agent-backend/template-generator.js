/**
 * Sistema de plantillas para generar archivos automáticamente
 * según el análisis del contenido del PDF
 */
class TemplateGenerator {
  constructor() {
    this.templates = this.initializeTemplates();
  }

  initializeTemplates() {
    return {
      // Plantilla para guía de código
      code_guide: {
        name: 'Guía de Código',
        extension: '.md',
        pattern: /código|programación|desarrollo|algoritmo|función|clase|método/i,
        generator: (content, analysis) => this.generateCodeGuide(content, analysis)
      },

      // Plantilla para resumen ejecutivo
      summary: {
        name: 'Resumen Ejecutivo',
        extension: '.txt',
        pattern: /resumen|importante|principal|clave|conclusión/i,
        generator: (content, analysis) => this.generateSummary(content, analysis)
      },

      // Plantilla para documentación técnica
      technical_doc: {
        name: 'Documentación Técnica',
        extension: '.md',
        pattern: /técnica|especificación|manual|procedimiento|proceso/i,
        generator: (content, analysis) => this.generateTechnicalDoc(content, analysis)
      },

      // Plantilla para análisis de datos
      data_analysis: {
        name: 'Análisis de Datos',
        extension: '.txt',
        pattern: /datos|estadística|métrica|número|porcentaje|resultado/i,
        generator: (content, analysis) => this.generateDataAnalysis(content, analysis)
      },

      // Plantilla para metodología
      methodology: {
        name: 'Metodología',
        extension: '.md',
        pattern: /metodología|método|enfoque|estrategia|procedimiento/i,
        generator: (content, analysis) => this.generateMethodology(content, analysis)
      },

      // Plantilla para código fuente
      source_code: {
        name: 'Código Fuente',
        extension: '.txt',
        pattern: /código|script|función|variable|sintaxis/i,
        generator: (content, analysis) => this.generateSourceCode(content, analysis)
      },

      // Plantilla para checklist/todo
      checklist: {
        name: 'Lista de Verificación',
        extension: '.md',
        pattern: /lista|verificar|paso|etapa|requisito|tarea/i,
        generator: (content, analysis) => this.generateChecklist(content, analysis)
      },

      // Plantilla para configuración
      configuration: {
        name: 'Archivo de Configuración',
        extension: '.json',
        pattern: /configuración|config|parámetro|setting|opción/i,
        generator: (content, analysis) => this.generateConfiguration(content, analysis)
      }
    };
  }

  /**
   * Analizar contenido y sugerir plantillas apropiadas
   */
  analyzeAndSuggestTemplates(content, userQuery = '') {
    const suggestions = [];
    const contentLower = content.toLowerCase();
    const queryLower = userQuery.toLowerCase();
    const combinedText = contentLower + ' ' + queryLower;

    for (const [key, template] of Object.entries(this.templates)) {
      if (template.pattern.test(combinedText)) {
        suggestions.push({
          key,
          name: template.name,
          extension: template.extension,
          relevance: this.calculateRelevance(combinedText, template.pattern),
          description: this.getTemplateDescription(key)
        });
      }
    }

    return suggestions.sort((a, b) => b.relevance - a.relevance);
  }

  calculateRelevance(text, pattern) {
    const matches = text.match(new RegExp(pattern.source, 'gi')) || [];
    return matches.length;
  }

  getTemplateDescription(templateKey) {
    const descriptions = {
      code_guide: 'Guía paso a paso para implementar código',
      summary: 'Resumen ejecutivo con puntos clave',
      technical_doc: 'Documentación técnica detallada',
      data_analysis: 'Análisis de datos y métricas',
      methodology: 'Metodología y procesos',
      source_code: 'Código fuente extraído y organizado',
      checklist: 'Lista de verificación y tareas',
      configuration: 'Archivo de configuración JSON'
    };
    return descriptions[templateKey] || 'Documento generado automáticamente';
  }

  /**
   * Generar archivo usando plantilla específica
   */
  async generateFile(templateKey, content, analysis, options = {}) {
    const template = this.templates[templateKey];
    if (!template) {
      throw new Error(`Plantilla no encontrada: ${templateKey}`);
    }

    const generatedContent = await template.generator(content, analysis);
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = options.fileName || `${templateKey}_${timestamp}${template.extension}`;

    return {
      fileName,
      content: generatedContent,
      template: template.name,
      size: generatedContent.length
    };
  }

  // Generadores específicos de plantillas

  generateCodeGuide(content, analysis) {
    const title = analysis.title || 'Guía de Código';
    const timestamp = new Date().toLocaleString();

    return `# ${title}

> Guía generada automáticamente desde PDF el ${timestamp}

## 📋 Información General

**Documento fuente:** PDF Analizado
**Páginas analizadas:** ${analysis.stats?.totalPages || 'N/A'}
**Fecha de generación:** ${timestamp}

## 🎯 Contenido Principal

${analysis.relevantContent?.map((item, index) => 
  `### ${index + 1}. ${item.content.substring(0, 100)}...

**Palabras clave:** ${item.matches?.join(', ') || 'N/A'}
**Relevancia:** ${item.relevance}/10

---`).join('\n\n') || 'No se encontró contenido específico de código.'}

## 💡 Puntos Clave Identificados

${this.extractKeyPoints(content).map((point, index) => `${index + 1}. ${point}`).join('\n')}

## 📝 Pasos Sugeridos

1. **Análisis del código:** Revisar la estructura identificada
2. **Implementación:** Seguir los patrones encontrados
3. **Pruebas:** Validar funcionalidad
4. **Documentación:** Completar comentarios

## 🔍 Recursos Adicionales

- Revise el documento original para más detalles
- Considere las mejores prácticas mencionadas
- Implemente validaciones según sea necesario

---
*Generado automáticamente por PDF2Agent*`;
  }

  generateSummary(content, analysis) {
    const timestamp = new Date().toLocaleString();
    
    return `RESUMEN EJECUTIVO
${('=').repeat(50)}

Documento: PDF Analizado
Fecha: ${timestamp}
Páginas: ${analysis.stats?.totalPages || 'N/A'}

PUNTOS PRINCIPALES:
${('=').repeat(20)}

${analysis.relevantContent?.map((item, index) => 
  `${index + 1}. ${item.content.substring(0, 200)}...`).join('\n\n') || 'Contenido no disponible.'}

DATOS RELEVANTES:
${('=').repeat(17)}

${analysis.numbers?.length > 0 ? 
  `Métricas encontradas: ${analysis.numbers.join(', ')}` : 
  'No se encontraron datos numéricos específicos.'}

CONCLUSIONES:
${('=').repeat(12)}

${this.extractConclusions(content).join('\n')}

RECOMENDACIONES:
${('=').repeat(16)}

1. Revisar los puntos principales identificados
2. Considerar la implementación de las sugerencias
3. Validar la información con el documento original
4. Mantener seguimiento de las métricas relevantes

---
Generado automáticamente por PDF2Agent el ${timestamp}`;
  }

  generateTechnicalDoc(content, analysis) {
    const title = analysis.title || 'Documentación Técnica';
    const timestamp = new Date().toLocaleString();

    return `# ${title}

## Información del Documento

- **Fuente:** PDF Analizado
- **Generado:** ${timestamp}
- **Páginas:** ${analysis.stats?.totalPages || 'N/A'}
- **Análisis:** Automático con PDF2Agent

## Descripción General

${analysis.specificAnalysis || 'Documento técnico extraído automáticamente del PDF fuente.'}

## Contenido Técnico Identificado

${analysis.relevantContent?.map((item, index) => 
  `### Sección ${index + 1}

${item.content}

**Términos clave:** ${item.matches?.join(', ') || 'N/A'}
**Relevancia:** ${item.relevance}/10

`).join('\n') || 'No se encontró contenido técnico específico.'}

## Especificaciones

${this.extractSpecifications(content).map(spec => `- ${spec}`).join('\n')}

## Procedimientos

${this.extractProcedures(content).map((proc, index) => `${index + 1}. ${proc}`).join('\n')}

## Consideraciones Técnicas

- Revisar todas las especificaciones con el documento original
- Validar los procedimientos antes de implementar
- Considerar las limitaciones mencionadas
- Mantener documentación actualizada

## Referencias

- Documento PDF original
- Análisis realizado el ${timestamp}
- Generado con PDF2Agent

---

*Este documento fue generado automáticamente. Revise el contenido original para obtener información completa y actualizada.*`;
  }

  generateDataAnalysis(content, analysis) {
    const timestamp = new Date().toLocaleString();
    
    return `ANÁLISIS DE DATOS - PDF
${('=').repeat(25)}

Generado: ${timestamp}
Fuente: PDF Analizado

MÉTRICAS IDENTIFICADAS:
${('=').repeat(22)}

${analysis.numbers?.length > 0 ? 
  analysis.numbers.map((num, index) => `${index + 1}. ${num}`).join('\n') : 
  'No se encontraron métricas numéricas específicas.'}

ESTADÍSTICAS DEL DOCUMENTO:
${('=').repeat(28)}

- Total de páginas: ${analysis.stats?.totalPages || 'N/A'}
- Total de párrafos: ${analysis.stats?.totalParagraphs || 'N/A'}
- Coincidencias encontradas: ${analysis.stats?.matchesFound || 'N/A'}
- Caracteres analizados: ${content.length.toLocaleString()}

DATOS RELEVANTES:
${('=').repeat(16)}

${analysis.relevantContent?.map((item, index) => 
  `${index + 1}. ${item.content.substring(0, 150)}...
   Relevancia: ${item.relevance}/10
   Términos: ${item.matches?.join(', ') || 'N/A'}
`).join('\n') || 'No se encontraron datos específicos.'}

ANÁLISIS ESTADÍSTICO:
${('=').repeat(20)}

${this.generateStatisticalSummary(content, analysis)}

RECOMENDACIONES:
${('=').repeat(15)}

1. Validar los datos numéricos con la fuente original
2. Considerar el contexto de cada métrica
3. Realizar análisis adicional si es necesario
4. Mantener seguimiento de las tendencias identificadas

---
Análisis generado automáticamente por PDF2Agent
${timestamp}`;
  }

  generateMethodology(content, analysis) {
    const title = analysis.title || 'Metodología Identificada';
    const timestamp = new Date().toLocaleString();

    return `# ${title}

## Información del Análisis

- **Documento:** PDF Analizado
- **Fecha de análisis:** ${timestamp}
- **Páginas procesadas:** ${analysis.stats?.totalPages || 'N/A'}

## Metodología Identificada

${analysis.specificAnalysis || 'Metodología extraída del análisis automático del PDF.'}

## Procesos Clave

${analysis.relevantContent?.map((item, index) => 
  `### Proceso ${index + 1}

${item.content}

**Elementos clave:** ${item.matches?.join(', ') || 'N/A'}

`).join('\n') || 'No se encontraron procesos metodológicos específicos.'}

## Pasos Metodológicos

${this.extractMethodologicalSteps(content).map((step, index) => `${index + 1}. ${step}`).join('\n')}

## Enfoques Identificados

${this.extractApproaches(content).map(approach => `- ${approach}`).join('\n')}

## Consideraciones Importantes

- Revisar el contexto completo en el documento original
- Validar la aplicabilidad de la metodología
- Considerar las limitaciones mencionadas
- Adaptar según las necesidades específicas

## Implementación Sugerida

1. **Análisis previo:** Revisar todos los componentes metodológicos
2. **Planificación:** Establecer cronograma y recursos
3. **Ejecución:** Implementar paso a paso
4. **Evaluación:** Medir resultados y ajustar

---

*Documento generado automáticamente por PDF2Agent el ${timestamp}*`;
  }

  generateSourceCode(content, analysis) {
    const timestamp = new Date().toLocaleString();
    
    return `// Código extraído del PDF
// Generado: ${timestamp}
// Fuente: Análisis automático de PDF

/**
 * CÓDIGO IDENTIFICADO EN EL DOCUMENTO
 * ====================================
 * 
 * Este archivo contiene código, funciones y fragmentos
 * identificados automáticamente en el PDF analizado.
 */

// FRAGMENTOS DE CÓDIGO ENCONTRADOS:
// =================================

${analysis.relevantContent?.map((item, index) => {
  const codeFragment = this.extractCodeFromText(item.content);
  return `// Fragmento ${index + 1}:
// Términos clave: ${item.matches?.join(', ') || 'N/A'}
${codeFragment}

`;
}).join('\n') || '// No se encontraron fragmentos de código específicos.'}

// FUNCIONES IDENTIFICADAS:
// ========================

${this.extractFunctions(content).map((func, index) => `// Función ${index + 1}:
${func}

`).join('\n')}

// VARIABLES Y CONSTANTES:
// ======================

${this.extractVariables(content).map(variable => `// ${variable}`).join('\n')}

// NOTAS IMPORTANTES:
// ==================
// 1. Revisar sintaxis antes de usar
// 2. Adaptar según el lenguaje específico
// 3. Validar lógica con el documento original
// 4. Implementar manejo de errores

// Generado automáticamente por PDF2Agent
// ${timestamp}`;
  }

  generateChecklist(content, analysis) {
    const timestamp = new Date().toLocaleString();
    
    return `# Lista de Verificación

> Generada automáticamente desde PDF el ${timestamp}

## 📋 Información General

- **Documento fuente:** PDF Analizado
- **Fecha de generación:** ${timestamp}
- **Páginas analizadas:** ${analysis.stats?.totalPages || 'N/A'}

## ✅ Elementos Identificados

${analysis.relevantContent?.map((item, index) => 
  `### ${index + 1}. ${item.content.substring(0, 100)}...

- [ ] Revisar contenido completo
- [ ] Validar información
- [ ] Implementar si corresponde
- [ ] Documentar cambios

**Términos clave:** ${item.matches?.join(', ') || 'N/A'}

---`).join('\n\n') || 'No se encontraron elementos específicos para verificar.'}

## 🎯 Tareas Generales

- [ ] Revisar documento PDF completo
- [ ] Validar toda la información extraída
- [ ] Implementar elementos relevantes
- [ ] Actualizar documentación
- [ ] Realizar pruebas de validación
- [ ] Crear respaldo de archivos generados

## 📝 Notas Adicionales

${this.extractNotes(content).map(note => `- ${note}`).join('\n')}

## 🔄 Seguimiento

- **Fecha de inicio:** ${timestamp}
- **Responsable:** [Asignar]
- **Estado:** Pendiente
- **Próxima revisión:** [Programar]

---

*Lista generada automáticamente por PDF2Agent*`;
  }

  generateConfiguration(content, analysis) {
    const timestamp = new Date().toISOString();
    
    const config = {
      metadata: {
        generated: timestamp,
        source: "PDF Analysis",
        generator: "PDF2Agent",
        version: "1.0"
      },
      document: {
        pages: analysis.stats?.totalPages || 0,
        matches: analysis.stats?.matchesFound || 0,
        relevantSections: analysis.relevantContent?.length || 0
      },
      settings: this.extractConfigSettings(content),
      parameters: this.extractParameters(content),
      options: {
        autoUpdate: false,
        validation: true,
        backup: true,
        logging: true
      },
      analysis: {
        keywords: analysis.relevantContent?.flatMap(item => item.matches || []) || [],
        numbers: analysis.numbers || [],
        categories: this.categorizeContent(content)
      }
    };

    return JSON.stringify(config, null, 2);
  }

  // Métodos auxiliares para extracción de contenido

  extractKeyPoints(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keyPhrases = ['importante', 'clave', 'principal', 'fundamental', 'esencial'];
    
    return sentences
      .filter(sentence => keyPhrases.some(phrase => sentence.toLowerCase().includes(phrase)))
      .slice(0, 5)
      .map(s => s.trim());
  }

  extractConclusions(content) {
    const conclusionWords = ['conclusión', 'resultado', 'finalmente', 'por tanto', 'en resumen'];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    return sentences
      .filter(sentence => conclusionWords.some(word => sentence.toLowerCase().includes(word)))
      .slice(0, 3)
      .map(s => s.trim());
  }

  extractSpecifications(content) {
    const specWords = ['especificación', 'requisito', 'característica', 'propiedad'];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
    
    return sentences
      .filter(sentence => specWords.some(word => sentence.toLowerCase().includes(word)))
      .slice(0, 5)
      .map(s => s.trim());
  }

  extractProcedures(content) {
    const procWords = ['paso', 'procedimiento', 'proceso', 'método', 'técnica'];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
    
    return sentences
      .filter(sentence => procWords.some(word => sentence.toLowerCase().includes(word)))
      .slice(0, 5)
      .map(s => s.trim());
  }

  extractMethodologicalSteps(content) {
    const stepPattern = /\d+\.\s*[^.]{10,100}/g;
    const matches = content.match(stepPattern) || [];
    return matches.slice(0, 10);
  }

  extractApproaches(content) {
    const approachWords = ['enfoque', 'estrategia', 'método', 'técnica', 'manera'];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
    
    return sentences
      .filter(sentence => approachWords.some(word => sentence.toLowerCase().includes(word)))
      .slice(0, 5)
      .map(s => s.trim());
  }

  extractCodeFromText(text) {
    // Buscar patrones que parezcan código
    const codePatterns = [
      /function\s+\w+\([^)]*\)\s*{[^}]*}/gi,
      /\w+\s*=\s*[^;]+;/gi,
      /if\s*\([^)]+\)\s*{[^}]*}/gi,
      /for\s*\([^)]+\)\s*{[^}]*}/gi
    ];
    
    let code = '';
    codePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        code += matches.join('\n') + '\n';
      }
    });
    
    return code || `// Código identificado en contexto:\n// ${text.substring(0, 200)}...`;
  }

  extractFunctions(content) {
    const functionPattern = /function\s+\w+|def\s+\w+|\w+\s*\([^)]*\)/gi;
    return content.match(functionPattern) || [];
  }

  extractVariables(content) {
    const varPattern = /\b(?:var|let|const|int|string|bool)\s+\w+/gi;
    return content.match(varPattern) || [];
  }

  extractNotes(content) {
    const noteWords = ['nota', 'importante', 'observación', 'cuidado', 'atención'];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
    
    return sentences
      .filter(sentence => noteWords.some(word => sentence.toLowerCase().includes(word)))
      .slice(0, 3)
      .map(s => s.trim());
  }

  extractConfigSettings(content) {
    const settings = {};
    const configPattern = /(\w+)\s*[:=]\s*([^,\n]+)/g;
    let match;
    
    while ((match = configPattern.exec(content)) !== null) {
      settings[match[1]] = match[2].trim();
    }
    
    return settings;
  }

  extractParameters(content) {
    const params = {};
    const paramPattern = /parámetro\s+(\w+)[:\s]+([^,\n]+)/gi;
    let match;
    
    while ((match = paramPattern.exec(content)) !== null) {
      params[match[1]] = match[2].trim();
    }
    
    return params;
  }

  categorizeContent(content) {
    const categories = {};
    const contentLower = content.toLowerCase();
    
    const categoryPatterns = {
      technical: /técnic|especificación|manual/gi,
      code: /código|programación|función/gi,
      data: /datos|estadística|métrica/gi,
      process: /proceso|metodología|procedimiento/gi,
      general: /general|información|contenido/gi
    };
    
    Object.entries(categoryPatterns).forEach(([category, pattern]) => {
      const matches = contentLower.match(pattern);
      categories[category] = matches ? matches.length : 0;
    });
    
    return categories;
  }

  generateStatisticalSummary(content, analysis) {
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = Math.round(words / sentences);
    
    return `- Total de palabras: ${words.toLocaleString()}
- Total de oraciones: ${sentences.toLocaleString()}
- Promedio palabras/oración: ${avgWordsPerSentence}
- Coincidencias encontradas: ${analysis.stats?.matchesFound || 0}
- Densidad de información: ${((analysis.stats?.matchesFound || 0) / words * 100).toFixed(2)}%`;
  }
}

module.exports = { TemplateGenerator };