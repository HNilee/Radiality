using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;

namespace RadialityInstaller
{
    public class SetupForm : Form
    {
        // Layout containers
        private Panel topBanner;
        private Label lblBannerTitle;
        private Label lblBannerSubtitle;
        private PictureBox picBannerIcon;
        private Panel bottomPanel;
        private Button btnBack;
        private Button btnNext;
        private Button btnCancel;
        private Panel contentPanel;

        // Pages
        private Panel pageLicense;
        private Panel pageDir;
        private Panel pageInstall;
        private Panel pageFinish;

        // Page 1: License
        private RadioButton rbAccept;
        private RadioButton rbReject;
        private TextBox txtLicense;

        // Page 2: Directory
        private TextBox txtInstallDir;
        private Button btnBrowse;

        // Page 3: Installing
        private Label lblCurrentStatus;
        private ProgressBar pbProgress;
        private TextBox txtLog;
        private BackgroundWorker installWorker;

        // Page 4: Finish
        private Panel sidebarFinish;
        private PictureBox picSidebarLogo;
        private CheckBox chkDesktop;
        private CheckBox chkLaunch;

        private int currentPage = 1;
        private string targetDirectory;
        private Image appLogo;

        public SetupForm()
        {
            LoadAppLogo();
            InitializeComponent();
            ShowPage(1);
        }

        private void LoadAppLogo()
        {
            try
            {
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream stream = asm.GetManifestResourceStream("AppLogo"))
                {
                    if (stream != null)
                    {
                        using (MemoryStream ms = new MemoryStream())
                        {
                            stream.CopyTo(ms);
                            ms.Position = 0;
                            appLogo = Image.FromStream(ms);
                            return;
                        }
                    }
                }
            }
            catch { }

            try
            {
                string localPng = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "public", "icon.png");
                if (File.Exists(localPng))
                {
                    appLogo = Image.FromFile(localPng);
                }
            }
            catch { }
        }

        private void InitializeComponent()
        {
            this.Text = "Setup - Radiality";
            this.ClientSize = new Size(510, 360);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = true;
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            this.BackColor = SystemColors.Control;

            targetDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), 
                "Radiality"
            );

            // Top Banner (Standard Windows Wizard 97 / Inno Setup style)
            topBanner = new Panel
            {
                Location = new Point(0, 0),
                Size = new Size(510, 60),
                BackColor = Color.White
            };
            topBanner.Paint += (s, e) => {
                using (Pen p = new Pen(Color.FromArgb(220, 220, 225)))
                {
                    e.Graphics.DrawLine(p, 0, 59, 510, 59);
                }
            };

            lblBannerTitle = new Label
            {
                Text = "License Agreement",
                Font = new Font("Segoe UI", 9F, FontStyle.Bold),
                Location = new Point(20, 11),
                AutoSize = true
            };
            lblBannerSubtitle = new Label
            {
                Text = "Please read the following important information before continuing.",
                Font = new Font("Segoe UI", 8.5F, FontStyle.Regular),
                ForeColor = Color.FromArgb(70, 70, 75),
                Location = new Point(35, 29),
                AutoSize = true
            };

            picBannerIcon = new PictureBox
            {
                Location = new Point(460, 12),
                Size = new Size(32, 32),
                SizeMode = PictureBoxSizeMode.StretchImage
            };
            if (appLogo != null)
            {
                picBannerIcon.Image = appLogo;
            }

            topBanner.Controls.Add(lblBannerTitle);
            topBanner.Controls.Add(lblBannerSubtitle);
            topBanner.Controls.Add(picBannerIcon);

            // Bottom Panel
            bottomPanel = new Panel
            {
                Dock = DockStyle.Bottom,
                Height = 46,
                BackColor = SystemColors.Control
            };
            bottomPanel.Paint += (s, e) => {
                using (Pen p = new Pen(Color.FromArgb(220, 220, 225)))
                {
                    e.Graphics.DrawLine(p, 0, 0, 510, 0);
                }
            };

            btnBack = new Button
            {
                Text = "< &Back",
                Size = new Size(75, 23),
                Location = new Point(265, 11),
                UseVisualStyleBackColor = true
            };
            btnBack.Click += (s, e) => {
                if (currentPage > 1) ShowPage(currentPage - 1);
            };

            btnNext = new Button
            {
                Text = "&Next >",
                Size = new Size(75, 23),
                Location = new Point(345, 11),
                UseVisualStyleBackColor = true
            };
            btnNext.Click += BtnNext_Click;

            btnCancel = new Button
            {
                Text = "Cancel",
                Size = new Size(75, 23),
                Location = new Point(425, 11),
                UseVisualStyleBackColor = true
            };
            btnCancel.Click += (s, e) => {
                if (currentPage == 3 && installWorker != null && installWorker.IsBusy)
                {
                    MessageBox.Show(
                        "Installation is currently in progress. Please wait for it to complete.", 
                        "Setup", 
                        MessageBoxButtons.OK, 
                        MessageBoxIcon.Information
                    );
                    return;
                }
                if (MessageBox.Show("Are you sure you want to cancel the installation?", "Exit Setup", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
                {
                    this.Close();
                }
            };

            bottomPanel.Controls.Add(btnBack);
            bottomPanel.Controls.Add(btnNext);
            bottomPanel.Controls.Add(btnCancel);

            // Main Content Panel
            contentPanel = new Panel
            {
                Location = new Point(0, 60),
                Size = new Size(510, 254),
                BackColor = SystemColors.Control
            };

            this.Controls.Add(contentPanel);
            this.Controls.Add(topBanner);
            this.Controls.Add(bottomPanel);

            SetupPageLicense();
            SetupPageDir();
            SetupPageInstall();
            SetupPageFinish();
        }

        private void SetupPageLicense()
        {
            pageLicense = new Panel { Dock = DockStyle.Fill, Visible = false };

            Label lblIntro = new Label
            {
                Text = "Please read the following License Agreement. You must accept the terms of this agreement before continuing with the installation.",
                Location = new Point(24, 10),
                Size = new Size(462, 32),
                Font = new Font("Segoe UI", 8.5F)
            };

            txtLicense = new TextBox
            {
                Location = new Point(24, 46),
                Size = new Size(462, 130),
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.White,
                Font = new Font("Segoe UI", 8.25F),
                Text = "END USER LICENSE AGREEMENT (EULA)\r\n" +
                       "Software: Radiality for Windows & macOS\r\n\r\n" +
                       "1. GRANT OF LICENSE\r\n" +
                       "This software is licensed, not sold, for personal and commercial desktop use on Windows and macOS.\r\n\r\n" +
                       "2. KEY FEATURES & CAPABILITIES\r\n" +
                       "- Smooth spring physics animated radial wheel toolbar.\r\n" +
                       "- Support for ALL files, executable binaries, documents, media, folders, and icons.\r\n" +
                       "- Interactive customizable trigger keybinding with anti-spam protection.\r\n" +
                       "- Automatic dismissal when clicking outside the radial menu.\r\n" +
                       "- Optional launch at system startup.\r\n\r\n" +
                       "3. PRIVACY & SECURITY\r\n" +
                       "Radiality runs 100% locally on your computer. No telemetry, shortcut paths, or personal user data are collected or transmitted.\r\n\r\n" +
                       "4. DISCLAIMER OF WARRANTY\r\n" +
                       "The software is provided 'AS IS' without warranty of any kind. In no event shall the authors be liable for any damages arising from its use."
            };

            rbAccept = new RadioButton
            {
                Text = "I &accept the agreement",
                Location = new Point(24, 185),
                AutoSize = true,
                Font = new Font("Segoe UI", 8.5F)
            };
            rbReject = new RadioButton
            {
                Text = "I &do not accept the agreement",
                Location = new Point(24, 206),
                AutoSize = true,
                Checked = true,
                Font = new Font("Segoe UI", 8.5F)
            };

            rbAccept.CheckedChanged += (s, e) => {
                btnNext.Enabled = rbAccept.Checked;
            };

            pageLicense.Controls.Add(lblIntro);
            pageLicense.Controls.Add(txtLicense);
            pageLicense.Controls.Add(rbAccept);
            pageLicense.Controls.Add(rbReject);

            contentPanel.Controls.Add(pageLicense);
        }

        private void SetupPageDir()
        {
            pageDir = new Panel { Dock = DockStyle.Fill, Visible = false };

            Label lblHeading = new Label
            {
                Text = "Setup will install Radiality into the following folder.",
                Location = new Point(24, 12),
                AutoSize = true,
                Font = new Font("Segoe UI", 8.5F)
            };

            Label lblSub = new Label
            {
                Text = "To continue, click Next. If you would like to select a different folder, click Browse.",
                Location = new Point(24, 32),
                AutoSize = true,
                Font = new Font("Segoe UI", 8.5F)
            };

            txtInstallDir = new TextBox
            {
                Location = new Point(24, 65),
                Size = new Size(375, 23),
                Text = targetDirectory,
                Font = new Font("Segoe UI", 8.5F)
            };

            btnBrowse = new Button
            {
                Text = "&Browse...",
                Location = new Point(408, 64),
                Size = new Size(78, 25),
                UseVisualStyleBackColor = true,
                Font = new Font("Segoe UI", 8.5F)
            };
            btnBrowse.Click += (s, e) => {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.Description = "Select Destination Folder";
                    fbd.SelectedPath = txtInstallDir.Text;
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        txtInstallDir.Text = fbd.SelectedPath;
                        targetDirectory = fbd.SelectedPath;
                    }
                }
            };

            Label lblSpace = new Label
            {
                Text = "At least 210 MB of free disk space is required.\r\nThe directory will be created automatically if it does not exist.",
                Location = new Point(24, 110),
                ForeColor = Color.FromArgb(90, 90, 95),
                AutoSize = true,
                Font = new Font("Segoe UI", 8.5F)
            };

            pageDir.Controls.Add(lblHeading);
            pageDir.Controls.Add(lblSub);
            pageDir.Controls.Add(txtInstallDir);
            pageDir.Controls.Add(btnBrowse);
            pageDir.Controls.Add(lblSpace);

            contentPanel.Controls.Add(pageDir);
        }

        private void SetupPageInstall()
        {
            pageInstall = new Panel { Dock = DockStyle.Fill, Visible = false };

            lblCurrentStatus = new Label
            {
                Text = "Extracting files...",
                Location = new Point(24, 14),
                Size = new Size(462, 18),
                Font = new Font("Segoe UI", 8.5F)
            };

            pbProgress = new ProgressBar
            {
                Location = new Point(24, 36),
                Size = new Size(462, 18),
                Style = ProgressBarStyle.Continuous,
                Minimum = 0,
                Maximum = 100,
                Value = 0
            };

            txtLog = new TextBox
            {
                Location = new Point(24, 66),
                Size = new Size(462, 172),
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.White,
                ForeColor = Color.FromArgb(40, 40, 45),
                Font = new Font("Consolas", 8F)
            };

            pageInstall.Controls.Add(lblCurrentStatus);
            pageInstall.Controls.Add(pbProgress);
            pageInstall.Controls.Add(txtLog);

            contentPanel.Controls.Add(pageInstall);
        }

        private void SetupPageFinish()
        {
            pageFinish = new Panel { Dock = DockStyle.Fill, Visible = false };

            // Left decorative sidebar (Inno Setup / NSIS modern wizard finish banner)
            sidebarFinish = new Panel
            {
                Location = new Point(0, 0),
                Size = new Size(160, 314),
                BackColor = Color.FromArgb(28, 28, 40)
            };
            sidebarFinish.Paint += (s, e) => {
                using (LinearGradientBrush brush = new LinearGradientBrush(
                    sidebarFinish.ClientRectangle,
                    Color.FromArgb(24, 24, 36),
                    Color.FromArgb(45, 45, 75),
                    LinearGradientMode.Vertical))
                {
                    e.Graphics.FillRectangle(brush, sidebarFinish.ClientRectangle);
                }
            };

            picSidebarLogo = new PictureBox
            {
                Location = new Point(56, 40),
                Size = new Size(48, 48),
                SizeMode = PictureBoxSizeMode.StretchImage
            };
            if (appLogo != null)
            {
                picSidebarLogo.Image = appLogo;
            }
            sidebarFinish.Controls.Add(picSidebarLogo);

            // Right side finish content
            Panel finishContent = new Panel
            {
                Location = new Point(175, 15),
                Size = new Size(325, 290),
                BackColor = SystemColors.Control
            };

            Label lblTitle = new Label
            {
                Text = "Completing the Radiality Setup Wizard",
                Location = new Point(0, 0),
                Size = new Size(315, 55),
                Font = new Font("Segoe UI", 12F, FontStyle.Bold),
                ForeColor = Color.FromArgb(20, 20, 30)
            };

            Label lblDesc = new Label
            {
                Text = "Setup has finished installing Radiality on your computer. The application may be launched by selecting the installed shortcuts.\r\n\r\nClick Finish to exit Setup.",
                Location = new Point(2, 60),
                Size = new Size(315, 68),
                Font = new Font("Segoe UI", 8.5F),
                ForeColor = Color.FromArgb(40, 40, 45)
            };

            chkDesktop = new CheckBox
            {
                Text = "Create a &desktop shortcut",
                Location = new Point(4, 142),
                AutoSize = true,
                Checked = true,
                Font = new Font("Segoe UI", 8.5F)
            };

            chkLaunch = new CheckBox
            {
                Text = "&Launch Radiality",
                Location = new Point(4, 168),
                AutoSize = true,
                Checked = true,
                Font = new Font("Segoe UI", 8.5F)
            };

            finishContent.Controls.Add(lblTitle);
            finishContent.Controls.Add(lblDesc);
            finishContent.Controls.Add(chkDesktop);
            finishContent.Controls.Add(chkLaunch);

            pageFinish.Controls.Add(sidebarFinish);
            pageFinish.Controls.Add(finishContent);

            this.Controls.Add(pageFinish);
        }

        private void ShowPage(int page)
        {
            currentPage = page;
            pageLicense.Visible = (page == 1);
            pageDir.Visible = (page == 2);
            pageInstall.Visible = (page == 3);
            pageFinish.Visible = (page == 4);

            if (page == 4)
            {
                // On Finish page, hide top banner and make finish panel occupy full height
                topBanner.Visible = false;
                contentPanel.Location = new Point(0, 0);
                contentPanel.Size = new Size(510, 314);
                pageFinish.BringToFront();

                btnBack.Visible = false;
                btnCancel.Visible = false;
                btnNext.Visible = true;
                btnNext.Text = "&Finish";
                btnNext.Location = new Point(425, 11);
                btnNext.Enabled = true;
                btnNext.Focus();
                return;
            }

            topBanner.Visible = true;
            contentPanel.Location = new Point(0, 60);
            contentPanel.Size = new Size(510, 254);

            btnBack.Visible = (page == 2);
            btnCancel.Visible = true;
            btnNext.Location = new Point(345, 11);

            if (page == 1)
            {
                lblBannerTitle.Text = "License Agreement";
                lblBannerSubtitle.Text = "Please review the license terms before installing Radiality.";
                btnNext.Text = "&Next >";
                btnNext.Enabled = rbAccept.Checked;
            }
            else if (page == 2)
            {
                lblBannerTitle.Text = "Select Destination Location";
                lblBannerSubtitle.Text = "Where should Radiality be installed?";
                btnNext.Text = "&Install";
                btnNext.Enabled = true;
            }
            else if (page == 3)
            {
                lblBannerTitle.Text = "Installing";
                lblBannerSubtitle.Text = "Please wait while Setup installs Radiality on your computer.";
                btnNext.Visible = false;
                btnBack.Visible = false;
                btnCancel.Enabled = false;
                StartInstallation();
            }
        }

        private void BtnNext_Click(object sender, EventArgs e)
        {
            if (currentPage == 1)
            {
                ShowPage(2);
            }
            else if (currentPage == 2)
            {
                targetDirectory = txtInstallDir.Text.Trim();
                if (string.IsNullOrEmpty(targetDirectory))
                {
                    MessageBox.Show("Destination folder cannot be empty.", "Setup", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                ShowPage(3);
            }
            else if (currentPage == 4)
            {
                FinalizeSetup();
            }
        }

        private void Log(string message)
        {
            if (txtLog.InvokeRequired)
            {
                txtLog.Invoke(new Action<string>(Log), message);
                return;
            }
            txtLog.AppendText(message + "\r\n");
            txtLog.SelectionStart = txtLog.Text.Length;
            txtLog.ScrollToCaret();
        }

        private void StartInstallation()
        {
            installWorker = new BackgroundWorker
            {
                WorkerReportsProgress = true
            };

            installWorker.DoWork += (s, e) => {
                try
                {
                    Log("Creating destination directory: " + targetDirectory);
                    if (!Directory.Exists(targetDirectory))
                    {
                        Directory.CreateDirectory(targetDirectory);
                    }

                    Assembly assembly = Assembly.GetExecutingAssembly();
                    using (Stream stream = assembly.GetManifestResourceStream("AppPayload"))
                    {
                        if (stream == null)
                        {
                            throw new Exception("Installation payload not found in setup package.");
                        }

                        using (ZipArchive archive = new ZipArchive(stream, ZipArchiveMode.Read))
                        {
                            int totalEntries = archive.Entries.Count;
                            int current = 0;

                            foreach (ZipArchiveEntry entry in archive.Entries)
                            {
                                current++;
                                int pct = (int)((float)current / totalEntries * 100);

                                string destPath = Path.Combine(targetDirectory, entry.FullName);
                                if (string.IsNullOrEmpty(entry.Name))
                                {
                                    Directory.CreateDirectory(destPath);
                                }
                                else
                                {
                                    string dir = Path.GetDirectoryName(destPath);
                                    if (!Directory.Exists(dir))
                                    {
                                        Directory.CreateDirectory(dir);
                                    }

                                    entry.ExtractToFile(destPath, true);
                                    Log(string.Format("Extracting: {0}", entry.FullName));
                                }

                                installWorker.ReportProgress(pct, entry.Name);
                            }
                        }
                    }

                    Log("\r\nExtraction completed successfully.");
                }
                catch (Exception ex)
                {
                    Log("\r\nError: " + ex.Message);
                    e.Result = ex;
                }
            };

            installWorker.ProgressChanged += (s, e) => {
                pbProgress.Value = Math.Min(100, Math.Max(0, e.ProgressPercentage));
                lblCurrentStatus.Text = string.Format("Extracting files ({0}%)...", e.ProgressPercentage);
            };

            installWorker.RunWorkerCompleted += (s, e) => {
                if (e.Result is Exception)
                {
                    MessageBox.Show("An error occurred during installation: " + ((Exception)e.Result).Message, "Installation Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    btnCancel.Enabled = true;
                    return;
                }

                Timer t = new Timer { Interval = 500 };
                t.Tick += (ts, te) => {
                    t.Stop();
                    ShowPage(4);
                };
                t.Start();
            };

            installWorker.RunWorkerAsync();
        }

        private void FinalizeSetup()
        {
            string exePath = Path.Combine(targetDirectory, "Radiality.exe");
            string uninstallerPath = Path.Combine(targetDirectory, "Radiality-Uninstall.exe");
            string iconPath = Path.Combine(targetDirectory, "public", "icon.ico");
            if (!File.Exists(iconPath))
            {
                iconPath = exePath;
            }

            // Desktop shortcut
            if (chkDesktop.Checked)
            {
                try
                {
                    string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                    string lnkPath = Path.Combine(desktopPath, "Radiality.lnk");
                    CreateShortcut(lnkPath, exePath, targetDirectory, iconPath, "Radiality - Radial Menu Toolbar");
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Error creating desktop shortcut: " + ex.Message);
                }
            }

            // Start Menu shortcut
            try
            {
                string startMenuPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "Radiality");
                if (!Directory.Exists(startMenuPath)) Directory.CreateDirectory(startMenuPath);
                string lnkPath = Path.Combine(startMenuPath, "Radiality.lnk");
                CreateShortcut(lnkPath, exePath, targetDirectory, iconPath, "Radiality - Radial Menu Toolbar");
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error creating start menu shortcut: " + ex.Message);
            }

            // Register in Windows Programs & Features
            try
            {
                using (var key = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\Radiality"))
                {
                    if (key != null)
                    {
                        key.SetValue("DisplayName", "Radiality");
                        key.SetValue("DisplayVersion", "1.0.0");
                        key.SetValue("Publisher", "Radiality Team");
                        key.SetValue("DisplayIcon", exePath);
                        key.SetValue("InstallLocation", targetDirectory);
                        if (File.Exists(uninstallerPath))
                        {
                            key.SetValue("UninstallString", "\"" + uninstallerPath + "\"");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error writing registry entry: " + ex.Message);
            }

            // Launch app
            if (chkLaunch.Checked && File.Exists(exePath))
            {
                try
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = exePath,
                        WorkingDirectory = targetDirectory
                    });
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Error launching app: " + ex.Message);
                }
            }

            this.Close();
        }

        private void CreateShortcut(string shortcutPath, string targetPath, string workingDir, string iconPath, string desc)
        {
            Type shellType = Type.GetTypeFromProgID("WScript.Shell");
            if (shellType == null) return;
            dynamic shell = Activator.CreateInstance(shellType);
            dynamic shortcut = shell.CreateShortcut(shortcutPath);
            shortcut.TargetPath = targetPath;
            shortcut.WorkingDirectory = workingDir;
            if (File.Exists(iconPath))
            {
                shortcut.IconLocation = iconPath;
            }
            shortcut.Description = desc;
            shortcut.Save();
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SetupForm());
        }
    }
}
