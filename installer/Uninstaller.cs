using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using Microsoft.Win32;

namespace RadialityInstaller
{
    public class Uninstaller
    {
        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            DialogResult dr = MessageBox.Show(
                "Are you sure you want to completely remove Radiality and all of its components from your computer?",
                "Radiality Uninstall",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );

            if (dr != DialogResult.Yes)
            {
                return;
            }

            try
            {
                // Stop any running instances
                foreach (Process p in Process.GetProcessesByName("Radiality"))
                {
                    try { p.Kill(); } catch { }
                }
                foreach (Process p in Process.GetProcessesByName("RadialMenu"))
                {
                    try { p.Kill(); } catch { }
                }

                System.Threading.Thread.Sleep(500);

                // Target directories
                string programFiles = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Radiality");
                string localPrograms = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Radiality");

                // Remove files
                if (Directory.Exists(programFiles))
                {
                    Directory.Delete(programFiles, true);
                }
                if (Directory.Exists(localPrograms))
                {
                    Directory.Delete(localPrograms, true);
                }

                // Shortcuts
                string desktopLnk1 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "Radiality.lnk");
                string desktopLnk2 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "Radial Menu.lnk");
                if (File.Exists(desktopLnk1)) File.Delete(desktopLnk1);
                if (File.Exists(desktopLnk2)) File.Delete(desktopLnk2);

                string startMenu1 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "Radiality");
                string startMenu2 = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "Radial Menu");
                if (Directory.Exists(startMenu1)) Directory.Delete(startMenu1, true);
                if (Directory.Exists(startMenu2)) Directory.Delete(startMenu2, true);

                // Registry
                try
                {
                    Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\Radiality", false);
                }
                catch { }

                MessageBox.Show(
                    "Radiality was successfully removed from your computer.",
                    "Uninstall Complete",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "An error occurred while removing Radiality: " + ex.Message,
                    "Uninstall Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}
