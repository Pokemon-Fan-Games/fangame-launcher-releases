# Fangame Launcher releases

Descargas oficiales de Fangame Launcher. Abre [Releases](https://github.com/Pokemon-Fan-Games/fangame-launcher-releases/releases) y elige el instalador para tu sistema y arquitectura.

## Linux: AppImage

El AppImage es compatible con distintas distribuciones, pero esta versión requiere **WebKitGTK 4.1** instalado en el sistema. Si al abrirlo aparece un error indicando que falta `libwebkit2gtk-4.1.so.0`, instala el paquete de tu distribución:

```sh
# Ubuntu / Debian
sudo apt install libwebkit2gtk-4.1-0

# Fedora
sudo dnf install webkit2gtk4.1

# Arch Linux
sudo pacman -S webkit2gtk-4.1
```

Después, desde la carpeta donde descargaste el archivo, dale permiso de ejecución y ábrelo. Sustituye `ARCHIVO.AppImage` por el nombre descargado:

```sh
chmod +x ./ARCHIVO.AppImage
./ARCHIVO.AppImage
```

En **Steam Deck**, prueba primero desde el modo Escritorio. SteamOS es de solo lectura; no desactives esa protección ni instales paquetes del sistema manualmente solo para resolver esta dependencia. Si el AppImage indica que falta WebKitGTK, consulta antes de modificar SteamOS.

## Otros sistemas

- **Ubuntu/Debian:** también puedes instalar el archivo `.deb` desde el centro de software o con `sudo apt install ./ARCHIVO.deb`.
- **Windows:** descarga y ejecuta el instalador `.exe`.
- **macOS:** descarga el `.dmg` correspondiente a Intel o Apple Silicon y mueve la app a Aplicaciones.

Descarga únicamente los instaladores adjuntos a las Releases oficiales de este repositorio.
