[Setup]
AppName=DLAS
AppVersion=1.0.6
DefaultDirName={pf}\DLAS
DefaultGroupName=DLAS
UninstallDisplayIcon={app}\DLAS.exe
Compression=lzma
SolidCompression=yes
LicenseFile=EULA.txt
OutputBaseFilename=DLAS_Setup
OutputDir=.
SetupIconFile=build\logo.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "korean"; MessagesFile: "compiler:Korean.isl"

[Files]
Source: "build\DLAS.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\intro.mp4"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\logo.png"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\white logo.jpg"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\modules.png"; DestDir: "{app}"; Flags: ignoreversion
Source: "build\loading.gif"; DestDir: "{app}"; Flags: ignoreversion
Source: "LICENSES\*"; DestDir: "{app}\LICENSES"; Flags: ignoreversion recursesubdirs
Source: "README.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\DLAS"; Filename: "{app}\DLAS.exe"
Name: "{group}\Uninstall DLAS"; Filename: "{uninstallexe}"
Name: "{commondesktop}\DLAS"; Filename: "{app}\DLAS.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop icon"; GroupDescription: "Additional icons:"; Flags: unchecked
