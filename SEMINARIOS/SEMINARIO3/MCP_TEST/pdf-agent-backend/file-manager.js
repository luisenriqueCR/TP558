const fs = require('fs').promises;
const path = require('path');

/**
 * Gestor de archivos inspirado en el MCP filesystem server
 * Permite crear, escribir, editar y gestionar archivos de manera segura
 */
class FileManager {
  constructor(allowedDirectories = []) {
    // Directorios permitidos para operaciones (seguridad)
    this.allowedDirectories = allowedDirectories.length > 0 
      ? allowedDirectories 
      : [path.join(process.cwd(), 'generated-files')];
    
    // Crear directorio por defecto si no existe
    this.ensureDefaultDirectory();
  }

  async ensureDefaultDirectory() {
    const defaultDir = this.allowedDirectories[0];
    try {
      await fs.access(defaultDir);
    } catch (error) {
      await fs.mkdir(defaultDir, { recursive: true });
      console.log(`📁 Directorio creado: ${defaultDir}`);
    }
  }

  /**
   * Verificar si una ruta está dentro de los directorios permitidos
   */
  isPathAllowed(filePath) {
    const absolutePath = path.resolve(filePath);
    return this.allowedDirectories.some(allowedDir => {
      const resolvedAllowed = path.resolve(allowedDir);
      return absolutePath.startsWith(resolvedAllowed);
    });
  }

  /**
   * Crear un archivo con contenido específico
   * Basado en write_file del MCP filesystem server
   */
  async writeFile(filePath, content, options = {}) {
    try {
      const absolutePath = path.resolve(filePath);
      
      if (!this.isPathAllowed(absolutePath)) {
        throw new Error(`Ruta no permitida: ${filePath}`);
      }

      // Crear directorio padre si no existe
      const dirName = path.dirname(absolutePath);
      await fs.mkdir(dirName, { recursive: true });

      // Escribir archivo
      await fs.writeFile(absolutePath, content, 'utf8');
      
      const stats = await fs.stat(absolutePath);
      
      return {
        success: true,
        path: absolutePath,
        size: stats.size,
        created: stats.birthtime,
        message: `✅ Archivo creado: ${path.basename(filePath)} (${stats.size} bytes)`
      };
    } catch (error) {
      throw new Error(`Error al crear archivo: ${error.message}`);
    }
  }

  /**
   * Crear directorio
   * Basado en create_directory del MCP filesystem server
   */
  async createDirectory(dirPath) {
    try {
      const absolutePath = path.resolve(dirPath);
      
      if (!this.isPathAllowed(absolutePath)) {
        throw new Error(`Ruta no permitida: ${dirPath}`);
      }

      await fs.mkdir(absolutePath, { recursive: true });
      
      return {
        success: true,
        path: absolutePath,
        message: `✅ Directorio creado: ${path.basename(dirPath)}`
      };
    } catch (error) {
      throw new Error(`Error al crear directorio: ${error.message}`);
    }
  }

  /**
   * Leer contenido de un archivo
   */
  async readFile(filePath, options = {}) {
    try {
      const absolutePath = path.resolve(filePath);
      
      if (!this.isPathAllowed(absolutePath)) {
        throw new Error(`Ruta no permitida: ${filePath}`);
      }

      const content = await fs.readFile(absolutePath, 'utf8');
      const stats = await fs.stat(absolutePath);
      
      // Implementar head y tail si se especifican
      let finalContent = content;
      if (options.head) {
        const lines = content.split('\n');
        finalContent = lines.slice(0, options.head).join('\n');
      } else if (options.tail) {
        const lines = content.split('\n');
        finalContent = lines.slice(-options.tail).join('\n');
      }
      
      return {
        content: finalContent,
        size: stats.size,
        modified: stats.mtime,
        path: absolutePath
      };
    } catch (error) {
      throw new Error(`Error al leer archivo: ${error.message}`);
    }
  }

  /**
   * Listar contenido de un directorio
   */
  async listDirectory(dirPath) {
    try {
      const absolutePath = path.resolve(dirPath);
      
      if (!this.isPathAllowed(absolutePath)) {
        throw new Error(`Ruta no permitida: ${dirPath}`);
      }

      const items = await fs.readdir(absolutePath, { withFileTypes: true });
      const contents = [];
      
      for (const item of items) {
        const itemPath = path.join(absolutePath, item.name);
        const stats = await fs.stat(itemPath);
        
        contents.push({
          name: item.name,
          type: item.isDirectory() ? 'directory' : 'file',
          size: item.isFile() ? stats.size : null,
          modified: stats.mtime,
          path: itemPath
        });
      }
      
      return {
        path: absolutePath,
        contents: contents.sort((a, b) => a.name.localeCompare(b.name))
      };
    } catch (error) {
      throw new Error(`Error al listar directorio: ${error.message}`);
    }
  }

  /**
   * Editar archivo existente con múltiples cambios
   * Basado en edit_file del MCP filesystem server
   */
  async editFile(filePath, edits, options = { dryRun: false }) {
    try {
      const absolutePath = path.resolve(filePath);
      
      if (!this.isPathAllowed(absolutePath)) {
        throw new Error(`Ruta no permitida: ${filePath}`);
      }

      const originalContent = await fs.readFile(absolutePath, 'utf8');
      let modifiedContent = originalContent;
      const appliedEdits = [];

      // Aplicar cada edición
      for (const edit of edits) {
        const { oldText, newText } = edit;
        
        if (modifiedContent.includes(oldText)) {
          modifiedContent = modifiedContent.replace(oldText, newText);
          appliedEdits.push({
            oldText: oldText.substring(0, 50) + (oldText.length > 50 ? '...' : ''),
            newText: newText.substring(0, 50) + (newText.length > 50 ? '...' : ''),
            applied: true
          });
        } else {
          appliedEdits.push({
            oldText: oldText.substring(0, 50) + (oldText.length > 50 ? '...' : ''),
            newText: newText.substring(0, 50) + (newText.length > 50 ? '...' : ''),
            applied: false,
            reason: 'Texto no encontrado'
          });
        }
      }

      if (options.dryRun) {
        return {
          dryRun: true,
          changes: appliedEdits,
          preview: modifiedContent !== originalContent ? 'Cambios detectados' : 'Sin cambios'
        };
      }

      // Aplicar cambios reales
      if (modifiedContent !== originalContent) {
        await fs.writeFile(absolutePath, modifiedContent, 'utf8');
      }

      return {
        success: true,
        path: absolutePath,
        editsApplied: appliedEdits.filter(e => e.applied).length,
        totalEdits: edits.length,
        changes: appliedEdits
      };
    } catch (error) {
      throw new Error(`Error al editar archivo: ${error.message}`);
    }
  }

  /**
   * Obtener información de un archivo o directorio
   */
  async getFileInfo(filePath) {
    try {
      const absolutePath = path.resolve(filePath);
      
      if (!this.isPathAllowed(absolutePath)) {
        throw new Error(`Ruta no permitida: ${filePath}`);
      }

      const stats = await fs.stat(absolutePath);
      
      return {
        path: absolutePath,
        name: path.basename(absolutePath),
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        permissions: stats.mode.toString(8)
      };
    } catch (error) {
      throw new Error(`Error al obtener información: ${error.message}`);
    }
  }

  /**
   * Buscar archivos por patrón
   */
  async searchFiles(dirPath, pattern, options = { recursive: true }) {
    try {
      const absolutePath = path.resolve(dirPath);
      
      if (!this.isPathAllowed(absolutePath)) {
        throw new Error(`Ruta no permitida: ${dirPath}`);
      }

      const results = [];
      
      const searchRecursive = async (currentPath) => {
        const items = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const item of items) {
          const itemPath = path.join(currentPath, item.name);
          
          if (item.name.includes(pattern)) {
            const stats = await fs.stat(itemPath);
            results.push({
              name: item.name,
              path: itemPath,
              type: item.isDirectory() ? 'directory' : 'file',
              size: item.isFile() ? stats.size : null
            });
          }
          
          if (item.isDirectory() && options.recursive) {
            await searchRecursive(itemPath);
          }
        }
      };
      
      await searchRecursive(absolutePath);
      
      return {
        pattern,
        searchPath: absolutePath,
        results: results.sort((a, b) => a.name.localeCompare(b.name))
      };
    } catch (error) {
      throw new Error(`Error en búsqueda: ${error.message}`);
    }
  }

  /**
   * Obtener directorios permitidos
   */
  getAllowedDirectories() {
    return this.allowedDirectories.map(dir => ({
      path: path.resolve(dir),
      accessible: true
    }));
  }

  /**
   * Generar estructura de árbol de directorios
   */
  async getDirectoryTree(dirPath, options = { maxDepth: 3, currentDepth: 0 }) {
    try {
      const absolutePath = path.resolve(dirPath);
      
      if (!this.isPathAllowed(absolutePath)) {
        throw new Error(`Ruta no permitida: ${dirPath}`);
      }

      if (options.currentDepth >= options.maxDepth) {
        return { name: path.basename(absolutePath), type: 'directory', children: [] };
      }

      const items = await fs.readdir(absolutePath, { withFileTypes: true });
      const children = [];
      
      for (const item of items) {
        const itemPath = path.join(absolutePath, item.name);
        
        if (item.isDirectory()) {
          const subtree = await this.getDirectoryTree(itemPath, {
            ...options,
            currentDepth: options.currentDepth + 1
          });
          children.push(subtree);
        } else {
          children.push({
            name: item.name,
            type: 'file'
          });
        }
      }
      
      return {
        name: path.basename(absolutePath),
        type: 'directory',
        children: children.sort((a, b) => {
          // Directorios primero, luego archivos
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        })
      };
    } catch (error) {
      throw new Error(`Error al generar árbol: ${error.message}`);
    }
  }
}

module.exports = { FileManager };