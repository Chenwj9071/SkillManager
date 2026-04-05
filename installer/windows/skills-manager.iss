#define MyAppName "Skills Manager"
#ifndef MyAppVersion
  #define MyAppVersion "0.1.0"
#endif
#ifndef MySourceDir
  #error MySourceDir is required
#endif
#ifndef MyOutputDir
  #error MyOutputDir is required
#endif

[Setup]
AppId={{C82E3D6F-D8CC-4C83-8D57-3E3E0F5F48AA}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=Skills Manager
DefaultDirName={localappdata}\SkillsManager
DefaultGroupName=Skills Manager
DisableProgramGroupPage=yes
OutputDir={#MyOutputDir}
OutputBaseFilename=SkillsManagerSetup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\start-app.cmd

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "{#MySourceDir}\package\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Skills Manager"; Filename: "{app}\start-app.cmd"; WorkingDir: "{app}"
Name: "{group}\Stop Skills Manager"; Filename: "{app}\stop-app.cmd"; WorkingDir: "{app}"
Name: "{autodesktop}\Skills Manager"; Filename: "{app}\start-app.cmd"; WorkingDir: "{app}"

[Run]
Filename: "{app}\start-app.cmd"; Description: "Launch Skills Manager"; Flags: nowait postinstall skipifsilent
