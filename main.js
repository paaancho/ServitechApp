const { app, BrowserWindow, Menu, dialog } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const prompt = require('electron-prompt');

const configPath = path.join(app.getPath('userData'), 'config.json');
let mainWindow;

async function getOrSetUrl(initial = false) {
    try {
        // Intenta leer la URL desde config.json
        const data = await fs.readFile(configPath, 'utf8');
        return JSON.parse(data).url;
    } catch (error) {
        if (initial) {
            let url = null;
            const result = await prompt({
                title: 'Configuración inicial',
                label: 'Ingresa la dirección URL otorgada por ServitechApp:',
                height: 250,
                width: 500,
                type: 'input',
                inputAttrs: {
                    type: 'text',
                    required: true
                },
                value: '',
                customHtml: `
                    <div>
                        <style>
                            p { font-size: 14px; margin-bottom: 10px; }
                            #prompt-input { width: 100%; padding: 5px; }
                        </style>
                        <p>URL base (no modificable): <strong>https://cloud.servitechapp.com/</strong></p>
                        <p>Nombre de la aplicación:</p>
                        <input id="prompt-input" placeholder="nombre-app" />
                    </div>
                `
            });

            if (result && result.trim()) {
                url = `https://cloud.servitechapp.com/${result.trim()}`;
                await fs.writeFile(configPath, JSON.stringify({ url }), 'utf8');
            }
            return url;
        }
        return null; // Si no es inicial y no hay URL, devuelve null
    }
}

async function changeUrl() {
    let newUrl = null;

    const result = await prompt({
        title: 'Cambiar URL',
        label: 'Ingresa la dirección URL otorgada por ServitechApp:',
        height: 250,
        width: 500,
        type: 'input',
        inputAttrs: {
            type: 'text',
            required: true
        },
        value: '',
        customHtml: `
            <div>
                <style>
                    p { font-size: 14px; margin-bottom: 10px; }
                    #prompt-input { width: 100%; padding: 5px; }
                </style>
                <p>URL base (no modificable): <strong>https://cloud.servitechapp.com/</strong></p>
                <p>Nombre de la aplicación:</p>
                <input id="prompt-input" placeholder="nombre-app" />
            </div>
        `
    });

    if (result && result.trim()) {
        newUrl = `https://cloud.servitechapp.com/${result.trim()}`;
        await fs.writeFile(configPath, JSON.stringify({ url: newUrl }), 'utf8');
        mainWindow.loadURL(newUrl);
    }   
}

function createWindow(url) {
    mainWindow = new BrowserWindow({
        title: "ServitechApp",
        width: 1200,
        height: 800,
        icon: path.join(__dirname, "assets/icon.ico"),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        frame: true // Barra de título con botones
    });

    if (url) {
        mainWindow.loadURL(url);
    } else {
        mainWindow.loadURL('data:text/html;charset="utf-8",<h2>Por favor, ingresa una URL desde el menú "Cambiar URL"</h2>');
    }

    // Ajustar tamaño después de que la página haya cargado
    mainWindow.webContents.once('did-finish-load', async () => {
        const { width, height } = await mainWindow.webContents.executeJavaScript(`
            (function() {
                const body = document.body;
                const html = document.documentElement;
                return {
                    width: Math.max(body.scrollWidth, html.scrollWidth, body.offsetWidth, html.offsetWidth, body.clientWidth, html.clientWidth),
                    height: Math.max(body.scrollHeight, html.scrollHeight, body.offsetHeight, html.offsetHeight, body.clientHeight, html.clientHeight)
                };
            })();
        `);
    
        // Agrega un margen de seguridad para evitar barras de desplazamiento
        const safeWidth = width + 20;  
        const safeHeight = height + 20;  
    
        // Obtiene el tamaño de la pantalla principal
        const { width: screenWidth, height: screenHeight } = require('electron').screen.getPrimaryDisplay().workAreaSize;
    
        // Calcula la posición para centrar la ventana
        const x = Math.round((screenWidth - safeWidth) / 2);
        const y = Math.round((screenHeight - safeHeight) / 2);
    
        // Ajusta la ventana y la centra
        mainWindow.setBounds({ x, y, width: safeWidth, height: safeHeight });
    });

    // Bloquea navegación fuera de la URL
    mainWindow.webContents.on('will-navigate', (e) => {
        e.preventDefault();
    });
    

    // Bloquea nuevas ventanas
    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: 'deny' };
    });

    // Crea el menú
    const menu = Menu.buildFromTemplate([
        {
            label: 'Cambiar URL',
            click: () => changeUrl()
        }
    ]);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
    const url = await getOrSetUrl(true); // true indica que es el inicio
    createWindow(url);

    app.on('activate', async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            const url = await getOrSetUrl();
            createWindow(url);
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});