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
VersionInfoVersion={#MyAppVersion}
VersionInfoDescription=Skills Manager Setup
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
CreateUninstallRegKey=yes
UninstallDisplayIcon={app}\start-app.cmd
SetupIconFile={#MySourceDir}\package\skill-manager.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "startup"; Description: "Run at login"; Flags: unchecked

[Files]
Source: "{#MySourceDir}\package\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Skills Manager"; Filename: "{app}\start-app.cmd"; WorkingDir: "{app}"; IconFilename: "{app}\skill-manager.ico"
Name: "{group}\Stop Skills Manager"; Filename: "{app}\stop-app.cmd"; WorkingDir: "{app}"; IconFilename: "{app}\skill-manager.ico"
Name: "{autodesktop}\Skills Manager"; Filename: "{app}\start-app.cmd"; WorkingDir: "{app}"; IconFilename: "{app}\skill-manager.ico"
Name: "{userstartup}\Skills Manager"; Filename: "{app}\start-app.cmd"; WorkingDir: "{app}"; Tasks: startup; IconFilename: "{app}\skill-manager.ico"

[Run]
Filename: "{app}\start-app.cmd"; Description: "Launch Skills Manager"; Flags: nowait postinstall skipifsilent

[Code]
var
  KeepLocalData: Boolean;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
  begin
    if UninstallSilent then
      KeepLocalData := True
    else
      KeepLocalData := MsgBox('Do you want to keep local data?', mbConfirmation, MB_YESNO) = IDYES;

    if not KeepLocalData then
      DelTree(ExpandConstant('{app}\data'), True, True, True);
  end;
end;
