/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  ExternalLink, 
  Code, 
  Eye, 
  Settings, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Check, 
  Copy, 
  Sparkles, 
  RefreshCw, 
  Mail, 
  PhoneCall, 
  FolderDown,
  ChevronRight,
  FileCheck2,
  Trophy,
  Palette,
  Activity,
  Database,
  FileSpreadsheet,
  Link,
  MessageSquare,
  LogOut,
  UserCheck
} from 'lucide-react';
import JSZip from 'jszip';
import { 
  BookingLead, 
  SheetSettings, 
  initAuth, 
  googleSignIn, 
  googleSignOut, 
  saveBookingLead, 
  listenToBookings, 
  markLeadAsSynced, 
  saveSheetSettings, 
  getSheetSettings 
} from './firebase';
import { createGoogleSheet, appendLeadToGoogleSheet } from './googleSheets';
import type { User } from 'firebase/auth';

export default function App() {
  // Static code states
  const [htmlContent, setHtmlContent] = useState('');
  const [cssContent, setCssContent] = useState('');
  const [jsContent, setJsContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Customizer state overrides
  const [academyName, setAcademyName] = useState("Saiguru's JB Sports Academy");
  const [academyPhone, setAcademyPhone] = useState("+91 98765 43210");
  const [academyEmail, setAcademyEmail] = useState("info@jbsportsacademy.com");
  const [academyColor, setAcademyColor] = useState<'volt' | 'orange' | 'crimson' | 'azure'>('volt');

  // Previewer states
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeCodeTab, setActiveCodeTab] = useState<'html' | 'css' | 'js'>('html');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [zipSuccess, setZipSuccess] = useState(false);

  // Google Sheets & leads state managers
  const [user, setUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingLead[]>([]);
  const [sheetSettings, setSheetSettings] = useState<SheetSettings | null>(null);
  const [isConnectingSheet, setIsConnectingSheet] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [inputSheetUrlOrId, setInputSheetUrlOrId] = useState('');

  // Monitor persistent Sheet settings and listen to auth + database bookings
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getSheetSettings();
      if (settings) {
        setSheetSettings(settings);
      }
    };
    loadSettings();

    // Monitor Firebase OAuth state
    const unsubscribeAuth = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setGoogleToken(token);
      },
      () => {
        setUser(null);
        setGoogleToken(null);
      }
    );

    // Subscribe to Firestore bookings (real-time synchronized)
    const unsubscribeBookings = listenToBookings((updatedBookings) => {
      setBookings(updatedBookings);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeBookings();
    };
  }, []);

  // Capture real-time submissions from the sandboxed iframe and store in Firebase & Sheets
  useEffect(() => {
    const handleIframeMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'BOOTSTRAP_BOOKING_SUBMIT') {
        const newBooking: BookingLead = event.data.booking;
        
        try {
          // 1. Save to Firestore
          const docId = await saveBookingLead(newBooking);
          
          // 2. Auto-append to Sheets in real-time if a valid connection and token is loaded!
          if (googleToken && sheetSettings?.spreadsheetId) {
            const success = await appendLeadToGoogleSheet(googleToken, sheetSettings.spreadsheetId, { ...newBooking, id: docId });
            if (success) {
              await markLeadAsSynced(docId);
            }
          }
        } catch (err) {
          console.error("Failed to persist booking lead:", err);
        }
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, [googleToken, sheetSettings]);

  // Auth & sheets trigger handlers
  const handleSignInGoogle = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setGoogleToken(result.accessToken);
        
        // Refresh sheet settings upon sign-in
        const settings = await getSheetSettings();
        if (settings) {
          setSheetSettings(settings);
        } else {
          // Auto-create a brand new sheet for the workspace automatically to deliver a seamless onboarding experience!
          try {
            setIsConnectingSheet(true);
            const newSettings = await createGoogleSheet(result.accessToken, academyName);
            await saveSheetSettings(newSettings);
            setSheetSettings(newSettings);
            
            // Retroactively synchronize all existing unsynced leads to the newly created sheet!
            const unsynced = bookings.filter(b => !b.syncedToSheets);
            if (unsynced.length > 0) {
              let syncedCount = 0;
              for (const lead of unsynced) {
                const success = await appendLeadToGoogleSheet(result.accessToken, newSettings.spreadsheetId, lead);
                if (success && lead.id) {
                  await markLeadAsSynced(lead.id);
                  syncedCount++;
                }
              }
              alert(`Successfully signed in! A new Google Sheet named "${newSettings.title}" has been created and synced with ${syncedCount} offline record(s) automatically!`);
            } else {
              alert(`Successfully signed in! A new Google Sheet named "${newSettings.title}" has been created and connected for you automatically.`);
            }
          } catch (createErr: any) {
            console.error("Auto sheet creation after sign-in failed:", createErr);
            alert(`Signed in successfully! However, automatic Google Sheet creation failed: ${createErr.message || createErr}. Please connect or create one manually using Option A or B.`);
          } finally {
            setIsConnectingSheet(false);
          }
        }
      }
    } catch (err) {
      console.error("Sign-in failed:", err);
      alert("Authentication failed. Please verify that popups are enabled in your browser.");
    }
  };

  const handleSignOutGoogle = async () => {
    if (window.confirm("Disconnect your Google account and stop syncing leads?")) {
      await googleSignOut();
      setUser(null);
      setGoogleToken(null);
    }
  };

  const handleCreateSheet = async () => {
    if (!googleToken) {
      alert("Please connect your Google Account first.");
      return;
    }
    setIsConnectingSheet(true);
    try {
      const newSettings = await createGoogleSheet(googleToken, academyName);
      await saveSheetSettings(newSettings);
      setSheetSettings(newSettings);
      
      // Retroactively synchronize all existing unsynced leads to the newly created sheet!
      const unsynced = bookings.filter(b => !b.syncedToSheets);
      if (unsynced.length > 0) {
        let syncedCount = 0;
        for (const lead of unsynced) {
          const success = await appendLeadToGoogleSheet(googleToken, newSettings.spreadsheetId, lead);
          if (success && lead.id) {
            await markLeadAsSynced(lead.id);
            syncedCount++;
          }
        }
        alert(`Successfully created spreadsheet and synchronized ${syncedCount} pending lead(s)!`);
      } else {
        alert("Google Sheet created and connected successfully!");
      }
    } catch (err: any) {
      console.error("Sheets creation failed:", err);
      alert(`Sheets creation failed: ${err.message || err}`);
    } finally {
      setIsConnectingSheet(false);
    }
  };

  const handleConnectExistingSheet = async (urlOrId: string) => {
    if (!googleToken) {
      alert("Please connect your Google Account first.");
      return;
    }
    if (!urlOrId.trim()) {
      alert("Please paste a valid Google Sheet URL or custom Spreadsheet ID.");
      return;
    }

    let spreadsheetId = urlOrId.trim();
    // Regex matching standard google spreadsheet URL formats: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/...
    const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      spreadsheetId = match[1];
    }

    setIsConnectingSheet(true);
    try {
      // 1. Validate that the Google Token has real access to the Spreadsheet by querying basic details
      const validateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${googleToken}`
        }
      });

      if (!validateRes.ok) {
        const errText = await validateRes.text();
        throw new Error(`Workspace access check failed. Ensure this sheet is owned by or shared with your connected Google account: ${errText}`);
      }

      const info = await validateRes.json();
      const title = info.properties?.title || "Custom Synced Sheet";

      const newSettings: SheetSettings = {
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        title
      };

      // 2. Persist to Firestore setting doc and React state
      await saveSheetSettings(newSettings);
      setSheetSettings(newSettings);
      setInputSheetUrlOrId('');

      // Retroactively sync pending leads to manual connected sheet!
      const unsynced = bookings.filter(b => !b.syncedToSheets);
      if (unsynced.length > 0) {
        let syncedCount = 0;
        for (const lead of unsynced) {
          const success = await appendLeadToGoogleSheet(googleToken, spreadsheetId, lead);
          if (success && lead.id) {
            await markLeadAsSynced(lead.id);
            syncedCount++;
          }
        }
        alert(`Successfully connected to "${title}" & synced ${syncedCount} pending lead(s)!`);
      } else {
        alert(`Successfully connected to existing Google Sheet: "${title}"!`);
      }
    } catch (err: any) {
      console.error("Manual connect failed:", err);
      alert(`Manual connect failed: ${err.message || err}`);
    } finally {
      setIsConnectingSheet(false);
    }
  };

  const handleSyncAllLeads = async () => {
    if (!googleToken || !sheetSettings?.spreadsheetId) {
      alert("Please connect a Google Sheet first.");
      return;
    }
    setIsSyncingAll(true);
    try {
      const unsynced = bookings.filter(b => !b.syncedToSheets);
      let successCount = 0;
      for (const lead of unsynced) {
        const success = await appendLeadToGoogleSheet(googleToken, sheetSettings.spreadsheetId, lead);
        if (success && lead.id) {
          await markLeadAsSynced(lead.id);
          successCount++;
        }
      }
      alert(`Bulk Sync completed! ${successCount} booking(s) appended successfully.`);
    } catch (err) {
      console.error("Bulk sync failed:", err);
      alert("An error occurred during synchronization. Please check your credentials.");
    } finally {
      setIsSyncingAll(false);
    }
  };

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch standard static files on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const hRes = await fetch('/academy/index.html');
        const cRes = await fetch('/academy/style.css');
        const jRes = await fetch('/academy/script.js');

        if (hRes.ok && cRes.ok && jRes.ok) {
          setHtmlContent(await hRes.text());
          setCssContent(await cRes.text());
          setJsContent(await jRes.text());
        }
      } catch (err) {
        console.error("Failed to load static source files:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // Theme color maps for variable replacements
  const colorSchemes = {
    volt: {
      volt: '#ceff00',
      glow: 'rgba(206, 255, 0, 0.35)',
      light: 'rgba(206, 255, 0, 0.08)',
      dim: 'rgba(206, 255, 0, 0.5)'
    },
    orange: {
      volt: '#ff6200',
      glow: 'rgba(255, 98, 0, 0.35)',
      light: 'rgba(255, 98, 0, 0.08)',
      dim: 'rgba(255, 98, 0, 0.5)'
    },
    crimson: {
      volt: '#ff0055',
      glow: 'rgba(255, 0, 85, 0.35)',
      light: 'rgba(255, 0, 85, 0.08)',
      dim: 'rgba(255, 0, 85, 0.5)'
    },
    azure: {
      volt: '#00d2ff',
      glow: 'rgba(0, 210, 255, 0.35)',
      light: 'rgba(0, 210, 255, 0.08)',
      dim: 'rgba(0, 210, 255, 0.5)'
    }
  };

  // Perform reactive code substitutions based on input overrides
  const getCustomizedHtml = () => {
    let content = htmlContent;
    if (!content) return '';
    
    // Split custom name dynamically for the HTML header and footer brand marks
    const spaceIndex = academyName.indexOf(' ');
    let firstPart = academyName;
    let secondPart = '';
    
    if (spaceIndex !== -1) {
      firstPart = academyName.substring(0, spaceIndex);
      secondPart = academyName.substring(spaceIndex + 1);
    }
    
    // Replace the structured brand layers
    content = content.replace(/class="brand-text-first"([^>]*)>([\s\S]*?)<\/span>/g, `class="brand-text-first"$1>${firstPart}</span>`);
    content = content.replace(/class="brand-text-second"([^>]*)>([\s\S]*?)<\/span>/g, `class="brand-text-second"$1>${secondPart}</span>`);

    // Replace general occurrences of the naming
    content = content.replace(/Saiguru's JB Sports Academy/g, academyName);
    content = content.replace(/Saiguru's JB Sports/g, academyName);
    
    // Replace telephone
    content = content.replace(/\+91 98765 43210/g, academyPhone);
    content = content.replace(/9876543210/g, academyPhone.replace(/[\s+-]/g, ''));
    
    // Replace email
    content = content.replace(/info@jbsportsacademy\.com/g, academyEmail);
    
    return content;
  };

  const getCustomizedCss = () => {
    let content = cssContent;
    if (!content) return '';
    
    const colors = colorSchemes[academyColor];
    
    // Replace CSS custom properties
    content = content.replace(/--volt:\s*[^;]+;/g, `--volt: ${colors.volt};`);
    content = content.replace(/--volt-glow:\s*[^;]+;/g, `--volt-glow: ${colors.glow};`);
    content = content.replace(/--volt-light:\s*[^;]+;/g, `--volt-light: ${colors.light};`);
    content = content.replace(/--volt-dim:\s*[^;]+;/g, `--volt-dim: ${colors.dim};`);
    
    return content;
  };

  const getCustomizedJs = () => {
    // JavaScript code is safe as is, but we can customize credentials if needed
    return jsContent;
  };

  // Update dynamic sandboxed iframe when state overrides update
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || isLoading) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();

      let previewHtml = getCustomizedHtml();
      const previewCss = getCustomizedCss();
      const previewJs = getCustomizedJs();

      // Ensure local image references map to public developer paths in host preview
      previewHtml = previewHtml.replace(/src="assets\/images\//g, 'src="/academy/assets/images/');
      previewHtml = previewHtml.replace(/poster="assets\/images\//g, 'poster="/academy/assets/images/');

      // Replace stylesheet link and script link with dynamically inline versions for preview speed
      previewHtml = previewHtml.replace(
        '<link rel="stylesheet" href="style.css">',
        `<style>${previewCss}</style>`
      );
      
      previewHtml = previewHtml.replace(
        '<script src="script.js"></script>',
        `<script>${previewJs}</script>`
      );

      doc.write(previewHtml);
      doc.close();
    }
  }, [htmlContent, cssContent, jsContent, academyName, academyPhone, academyEmail, academyColor, isLoading]);

  // Handle single tab copying
  const handleCopyCode = (type: 'html' | 'css' | 'js') => {
    let textToCopy = '';
    if (type === 'html') textToCopy = getCustomizedHtml();
    else if (type === 'css') textToCopy = getCustomizedCss();
    else textToCopy = getCustomizedJs();

    navigator.clipboard.writeText(textToCopy);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Compile standalone .ZIP bundle dynamically in client browser
  const handleExportZip = async () => {
    setIsGeneratingZip(true);
    setZipSuccess(false);

    try {
      const zip = new JSZip();

      // 1. Add static responsive code
      zip.file('index.html', getCustomizedHtml());
      zip.file('style.css', getCustomizedCss());
      zip.file('script.js', getCustomizedJs());

      // 2. Fetch and package actual operational image binaries from public folders
      const imageNames = ['hero.jpg', 'soccer.jpg', 'basketball.jpg', 'tennis.jpg', 'badminton.jpg', 'dance.jpg', 'yoga.jpg', 'gymnastics.jpg', 'zumba.jpg'];
      const imageFolder = zip.folder('assets/images');

      if (imageFolder) {
        for (const imgName of imageNames) {
          try {
            const response = await fetch(`/academy/assets/images/${imgName}`);
            if (response.ok) {
              const arrayBuf = await response.arrayBuffer();
              imageFolder.file(imgName, arrayBuf);
            }
          } catch (fetchErr) {
            console.error(`Skipping file export for ${imgName} as it was not loaded on dev server`, fetchErr);
          }
        }
      }

      // 3. Generate file trigger
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `academy_website_${academyName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setZipSuccess(true);
    } catch (err) {
      console.error("ZIP Generation error:", err);
      alert("Something went wrong compiling your zip. Please try again.");
    } finally {
      setIsGeneratingZip(false);
      setTimeout(() => setZipSuccess(false), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="pro-hub">
      
      {/* Workspace top status bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lime-400 text-slate-950 rounded-xl flex items-center justify-content-center shadow-lg shadow-lime-400/15">
            <Trophy className="w-5 h-5 m-auto" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Sports Academy Hub Workspace
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              TEMPLATES PARSED ONLINE &bull; READY FOR ZIP EXPORT
            </p>
          </div>
        </div>

        {/* Top Header CTA links */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <a 
            href="/academy/index.html" 
            target="_blank" 
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition rounded-lg border border-slate-700"
            id="external-preview"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Launch Full Screen
          </a>

          <button
            onClick={handleExportZip}
            disabled={isGeneratingZip}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 rounded-lg shadow-lg transition-all focus:outline-none ${
              zipSuccess 
                ? 'bg-emerald-400 hover:bg-emerald-500 shadow-emerald-400/20' 
                : 'bg-lime-400 hover:bg-lime-300 shadow-lime-400/25 active:scale-95'
            } disabled:opacity-50`}
            id="export-zip-btn"
          >
            {isGeneratingZip ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Compiling ZIP...
              </>
            ) : zipSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Downloaded!
              </>
            ) : (
              <>
                <FolderDown className="w-4 h-4 text-slate-950 font-bold" />
                Export Production ZIP
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main workspace layout */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 overflow-hidden">
        
        {/* Left Hand: Controller & Code Explorer */}
        <aside className="xl:col-span-5 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-140px)]">
          
          {/* Quick theme branding details */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-5 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
              <Trophy className="w-48 h-48 text-lime-400" />
            </div>
            
            <span className="text-[10px] font-bold font-mono tracking-wider text-lime-400 bg-lime-400/10 px-2 py-1 rounded">
              TEMPLATE ENGINE
            </span>
            <h2 className="text-xl font-bold text-white mt-2.5">
              Customize & Pack Website
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              Test your requirements directly. Update academy labels, communications and branding colors. Real-time updates sync with both the responsive simulator and the exported production ZIP bundle.
            </p>
          </div>

          {/* Settings Customizer Dashboard */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <Settings className="w-4 h-4 text-lime-400" />
              Dynamic Content Overrides
            </h3>

            <div className="space-y-4">
              {/* Academy Name */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                  Academy Name Label
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={academyName}
                    onChange={(e) => setAcademyName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/20"
                    placeholder="e.g. Saiguru's JB Sports Academy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Telephone */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                    Enquiry Helpline
                  </label>
                  <input 
                    type="text" 
                    value={academyPhone}
                    onChange={(e) => setAcademyPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/20"
                  />
                </div>

                {/* Email address */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                    Enquiry Email Desk
                  </label>
                  <input 
                    type="email" 
                    value={academyEmail}
                    onChange={(e) => setAcademyEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400/20"
                  />
                </div>
              </div>

              {/* Athletic Color picker */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide flex items-center justify-between">
                  <span>Branding Theme Accent</span>
                  <span className="text-[10px] font-mono text-lime-400">Recompiling core CSS...</span>
                </label>
                
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setAcademyColor('volt')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-mono rounded-lg border transition ${
                      academyColor === 'volt'
                        ? 'border-lime-400 bg-lime-400/10 text-lime-400'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ceff00] inline-block"></span>
                    Volt
                  </button>

                  <button
                    onClick={() => setAcademyColor('orange')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-mono rounded-lg border transition ${
                      academyColor === 'orange'
                        ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff6200] inline-block"></span>
                    Flame
                  </button>

                  <button
                    onClick={() => setAcademyColor('crimson')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-mono rounded-lg border transition ${
                      academyColor === 'crimson'
                        ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff0055] inline-block"></span>
                    Ruby
                  </button>

                  <button
                    onClick={() => setAcademyColor('azure')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-mono rounded-lg border transition ${
                      academyColor === 'azure'
                        ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00d2ff] inline-block"></span>
                    Azure
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Google Sheets Integration & Booking Leads */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Google Sheets Sync Settings
            </h3>

            {!user ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Connect your Google account to sync newly submitted classroom and academy inquiries directly to a Google Spreadsheet in real-time.
                </p>
                <button
                  type="button"
                  onClick={handleSignInGoogle}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs rounded-lg shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  Connect Google Sheets
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Connected User Profile */}
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} className="w-7 h-7 rounded-full border border-slate-700 pointer-events-none" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                        <UserCheck className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {user.displayName || 'Authorized Admin'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOutGoogle}
                    className="text-[10px] text-slate-400 hover:text-rose-400 font-mono transition flex items-center gap-1 cursor-pointer"
                    title="Disconnect Google Account"
                  >
                    <LogOut className="w-3 h-3" />
                    Disconnect
                  </button>
                </div>

                {/* Sheet settings info */}
                {!sheetSettings ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <strong className="text-emerald-400">Option A:</strong> Create a brand-new, auto-formatted spreadsheet in your Google Drive.
                      </p>
                      <button
                        type="button"
                        disabled={isConnectingSheet}
                        onClick={handleCreateSheet}
                        className="w-full py-2.5 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-400/10"
                      >
                        {isConnectingSheet ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Creating Spreadsheet...
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet className="w-4 h-4" />
                            Create New Google Sheet
                          </>
                        )}
                      </button>
                    </div>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-slate-800"></div>
                      <span className="flex-shrink mx-3 text-[9px] font-mono text-slate-500 uppercase tracking-widest">OR</span>
                      <div className="flex-grow border-t border-slate-800"></div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <strong className="text-cyan-400">Option B:</strong> Paste the URL of any existing Google Sheet from your account.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          value={inputSheetUrlOrId}
                          onChange={(e) => setInputSheetUrlOrId(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 text-xs rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 outline-none transition"
                        />
                        <button
                          type="button"
                          disabled={isConnectingSheet || !inputSheetUrlOrId.trim()}
                          onClick={() => handleConnectExistingSheet(inputSheetUrlOrId)}
                          className="px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-250 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition active:scale-95 flex items-center justify-center"
                        >
                          Link
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-emerald-950/20 text-emerald-400 border border-emerald-500/10 rounded-lg p-3 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-emerald-400">
                          Active Spreadsheet
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                      </div>
                      <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        {sheetSettings.title}
                      </div>
                      
                      <div className="flex gap-2 mt-1">
                        <a
                          href={sheetSettings.spreadsheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 text-center py-1.5 px-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-sans font-bold rounded text-emerald-300 transition-all flex items-center justify-center gap-1 text-decoration-none"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open Connected Google Sheet
                        </a>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm("Disconnect current Google Sheet? New registrations will stop syncing.")) {
                            await saveSheetSettings(null as any);
                            setSheetSettings(null);
                          }
                        }}
                        className="text-[10px] text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      >
                        Disconnect Spreadsheet &times;
                      </button>
                    </div>

                    {bookings.filter(b => !b.syncedToSheets).length > 0 && (
                      <div className="flex justify-between items-center bg-amber-950/10 border border-amber-500/15 rounded-lg p-2.5">
                        <span className="text-[10px] font-semibold text-amber-300 font-mono">
                          {bookings.filter(b => !b.syncedToSheets).length} unsynced inquiry lead(s)
                        </span>
                        <button
                          type="button"
                          disabled={isSyncingAll}
                          onClick={handleSyncAllLeads}
                          className="py-1 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded transition flex items-center gap-1.5 cursor-pointer"
                        >
                          {isSyncingAll ? (
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            <Database className="w-2.5 h-2.5" />
                          )}
                          Sync Now
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Real-time Inbound Booking Inquiries (Firestore-sourced) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Database className="w-4 h-4 text-lime-400" />
                Live Inbound Booking Leads
              </h3>
              <span className="text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                {bookings.length} Registered
              </span>
            </div>

            {/* Sync status helper banner */}
            {!user || !googleToken ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 flex items-start gap-2.5">
                <span className="text-amber-500 text-xs mt-0.5 font-bold">⚠️</span>
                <div className="text-[10px] text-slate-300 leading-relaxed">
                  <span className="font-bold text-amber-400">Google Account not connected:</span> New inquiries are stored securely in the Firestore database, but they will <span className="font-semibold text-white">not</span> sync to Google Sheets until you sign in on the left pane and create or linkage a spreadsheet.
                </div>
              </div>
            ) : !sheetSettings ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 flex flex-col gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="text-amber-500 text-xs mt-0.5 font-bold">⚠️</span>
                  <div className="text-[10px] text-slate-300 leading-relaxed">
                    <span className="font-bold text-amber-400">Google Sheet not connected:</span> Authorized with Google but no sheet represents a sync target. You can create a new sheet on the left sidebar, or click below to auto-build one instantly!
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isConnectingSheet}
                  onClick={handleCreateSheet}
                  className="w-full mt-1 py-1.5 px-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-[10px] rounded flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {isConnectingSheet ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Creating Spreadsheet...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Auto-Create & Sync Spreadsheet Now
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 flex items-start gap-2.5">
                <span className="text-emerald-400 text-xs mt-0.5 font-bold">✓</span>
                <div className="text-[10px] text-slate-300 leading-relaxed">
                  <span className="font-bold text-emerald-400">Active Real-Time Sync:</span> Connected to Google Sheet &ldquo;<span className="font-semibold text-white">{sheetSettings.title}</span>&rdquo;. Any new forms filled in the sandbox will auto-sync instantly.
                </div>
              </div>
            )}

            {bookings.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-950/40 rounded-xl border border-slate-800/60 flex flex-col gap-2">
                <Sparkles className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-semibold text-center">No inquiries logged yet</p>
                <p className="text-[10.5px] text-slate-500 max-w-[280px] mx-auto text-center leading-relaxed">
                  Fill out and submit the "Send Us an Inquiry" form inside the sandbox preview layout on the right to test real-time Firestore database and Google Sheets propagation.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {bookings.map((booking) => (
                  <div 
                    key={booking.id || booking.ticketRef} 
                    className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700 transition relative flex flex-col gap-2.5"
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5 truncate">
                          <span className="truncate">{booking.parentName}</span>
                          <span className="text-[9px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-1 py-0.5 rounded-sm">
                            {booking.ticketRef}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                          <span className="bg-lime-500/10 text-lime-400 font-semibold px-1 rounded-sm">
                            {booking.preferredSport}
                          </span>
                          <span className="text-slate-500 font-mono">
                            Subject: {booking.childAge}
                          </span>
                        </div>
                      </div>

                      {/* Sync indicators */}
                      {booking.syncedToSheets ? (
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 rounded-full flex items-center gap-1 py-0.5 flex-shrink-0">
                          <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                          Synced
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 rounded-full flex items-center gap-1 py-0.5 flex-shrink-0">
                          <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                          Pending
                        </span>
                      )}
                    </div>

                    {booking.specialNotes && (
                      <p className="text-[10px] text-slate-400 italic bg-slate-900/50 p-2 rounded border border-slate-800/60 leading-relaxed margin-0">
                        &ldquo;{booking.specialNotes}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px]">
                      <span className="font-mono text-[9px] text-slate-500">
                        {new Date(booking.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(booking.timestamp).toLocaleDateString()}
                      </span>

                      <div className="flex gap-2">
                        {/* Direct WhatsApp Follow-up click trigger */}
                        <a
                          href={`https://wa.me/91${booking.parentPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Hi ${booking.parentName}! Following up on your Academy inquiry request (${booking.ticketRef}).\n\n` +
                            `• Selected Subject: ${booking.childAge}\n` +
                            `• Program: ${booking.preferredSport}\n\n` +
                            `Let's finalize your scheduling details!`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-1 px-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-sans rounded text-decoration-none flex items-center gap-1 transition text-xs"
                          title="Contact sender directly on WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3 text-slate-950 font-bold" />
                          WhatsApp
                        </a>

                        <a
                          href={`mailto:jagdishvyapari@gmail.com?subject=${encodeURIComponent(
                            `Acknowledgment - Sport Academy Inquiry ${booking.ticketRef}`
                          )}&body=${encodeURIComponent(
                            `Hi Jagdish Vyapari,\n\n` +
                            `This is the acknowledgment email with all the filled information from the academy contact form:\n\n` +
                            `--------------------------------------------------\n` +
                            `• INQUIRY REFERENCE: ${booking.ticketRef}\n` +
                            `• SENDER FULL NAME: ${booking.parentName}\n` +
                            `• WHATSAPP / TELEPHONE: +91 ${booking.parentPhone}\n` +
                            `• CONTACT EMAIL: ${booking.parentEmail}\n` +
                            `• SELECTED SUBJECT: ${booking.childAge}\n` +
                            `• ACADEMY PROGRAM: ${booking.preferredSport}\n` +
                            `• MESSAGE DETAIL:\n` +
                            `  "${booking.specialNotes || 'None'}"\n` +
                            `• RECEIVED AT: ${new Date(booking.timestamp).toLocaleString()}\n` +
                            `--------------------------------------------------\n\n` +
                            `Best Regards,\n` +
                            `Academy Contact Portal`
                          )}`}
                          className="py-1 px-2 border border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white rounded flex items-center gap-1 transition text-xs flex items-center gap-1"
                          title="Send acknowledgment email with filled details to jagdishvyapari@gmail.com"
                        >
                          <Mail className="w-3 h-3 text-lime-400" />
                          <span>Email Ack</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Code Inspector Tabs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex-1 flex flex-col min-h-[350px]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Code className="w-4 h-4 text-lime-400" />
                Source Code Inspector
              </h3>
              
              <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveCodeTab('html')}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider transition ${
                    activeCodeTab === 'html' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  index.html
                </button>
                <button
                  onClick={() => setActiveCodeTab('css')}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider transition ${
                    activeCodeTab === 'css' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  style.css
                </button>
                <button
                  onClick={() => setActiveCodeTab('js')}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider transition ${
                    activeCodeTab === 'js' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  script.js
                </button>
              </div>
            </div>

            {/* Code display boxes */}
            <div className="relative flex-1 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex flex-col">
              {/* Copy button */}
              <button 
                onClick={() => handleCopyCode(activeCodeTab)}
                className="absolute top-3 right-3 z-10 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition active:scale-95"
                title="Copy current file contents"
              >
                {copiedType === activeCodeTab ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-mono">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="text-[10px] font-mono">Copy Link</span>
                  </>
                )}
              </button>

              <pre className="p-4 flex-1 overflow-auto text-[11px] font-mono leading-relaxed text-slate-300 max-h-[300px] select-all">
                <code>
                  {activeCodeTab === 'html' && (getCustomizedHtml() || "Please wait, parsing templates...")}
                  {activeCodeTab === 'css' && (getCustomizedCss() || "Please wait, parsing properties...")}
                  {activeCodeTab === 'js' && (getCustomizedJs() || "Please wait, parsing structures...")}
                </code>
              </pre>
            </div>
            
            <div className="mt-3 bg-slate-950 rounded-lg p-2.5 border border-slate-800/60 flex items-center justify-between text-[10px] text-neutral">
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="w-3 h-3 text-lime-400" />
                Validated for cross-device support
              </span>
              <span>Bootstrap 5.3 + ES6 standard</span>
            </div>
          </div>
        </aside>

        {/* Right Hand: Responsive simulator */}
        <main className="xl:col-span-7 flex flex-col gap-4">
          {/* Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">
                Responsive Viewport Live Sandbox
              </span>
            </div>

            {/* Viewport selectors */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewportMode('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  viewportMode === 'desktop' ? 'bg-slate-800 text-volt font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Desktop View"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono">Desktop</span>
              </button>
              <button
                onClick={() => setViewportMode('tablet')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  viewportMode === 'tablet' ? 'bg-slate-800 text-volt font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tablet View"
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono">Tablet</span>
              </button>
              <button
                onClick={() => setViewportMode('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  viewportMode === 'mobile' ? 'bg-slate-800 text-volt font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Mobile View"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono">Mobile</span>
              </button>
            </div>
          </div>

          {/* Preview stage with simulated framing */}
          <div className="flex-grow bg-slate-950 rounded-2xl border border-slate-800 p-2 flex items-center justify-center overflow-hidden min-h-[500px] relative">
            <div 
              style={{
                width: viewportMode === 'desktop' ? '100%' : viewportMode === 'tablet' ? '768px' : '400px',
                height: '100%',
                maxHeight: '680px',
                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              className={`relative shadow-2xl rounded-xl overflow-hidden border ${
                viewportMode === 'desktop' 
                  ? 'border-slate-800/50' 
                  : viewportMode === 'tablet' 
                    ? 'border-slate-700/80 ring-8 ring-slate-850/80' 
                    : 'border-slate-700/90 ring-12 ring-slate-850/90 rounded-[35px]'
              } bg-[#0b0f19] flex`}
            >
              {isLoading ? (
                <div className="m-auto text-center py-20 flex flex-col gap-3">
                  <RefreshCw className="w-8 h-8 text-lime-400 animate-spin mx-auto" />
                  <p className="text-xs font-mono text-slate-400">Loading sport templates...</p>
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  className="w-full h-full min-h-[640px] border-0"
                  title="Saiguru's JB Sports Academy static preview"
                />
              )}

              {/* simulated phone notch indicator */}
              {viewportMode === 'mobile' && (
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-32 h-4.5 bg-slate-850 rounded-full z-40 flex items-center px-3 justify-between">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <div className="w-12 h-1 bg-slate-700 rounded-full"></div>
                  <span className="w-2 h-2 rounded-full bg-slate-950 border border-slate-800"></span>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
