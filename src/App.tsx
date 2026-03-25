import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  Zap, MapPin, Wifi, Battery, Clock, Bluetooth, Music, Moon, 
  Plus, ArrowLeft, Loader2, Settings, Smartphone, Sparkles, 
  Trash2, Volume2, Monitor, AppWindow, Settings2, Wand2, 
  GitCommit, CheckCircle2, ChevronDown, Variable, Repeat, 
  Split, Code, ShieldAlert, FileText, Database, Network,
  Braces, Download, Upload, Edit2, Terminal, Play, Save,
  Activity, ShieldCheck, Cpu, Layers, Lock, BarChart3, 
  History, Search, Replace, AlertTriangle, Shield, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { Stage, Layer, Rect, Text, Circle, Line } from 'react-konva';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const IconMap: Record<string, React.ElementType> = {
  Zap, MapPin, Wifi, Battery, Clock, Bluetooth, Music, Moon, Smartphone, Code, ShieldAlert, FileText, Database, Network
};

type ActionCategory = 'Connectivity' | 'Sound' | 'Display' | 'Apps' | 'System Settings' | 'Variables' | 'Logic' | 'File System' | 'Network' | 'Root/ADB' | 'Termux' | 'Other';

const CategoryIconMap: Record<ActionCategory, React.ElementType> = {
  'Connectivity': Wifi,
  'Sound': Volume2,
  'Display': Monitor,
  'Apps': AppWindow,
  'System Settings': Settings2,
  'Variables': Variable,
  'Logic': Split,
  'File System': FileText,
  'Network': Network,
  'Root/ADB': ShieldAlert,
  'Termux': Terminal,
  'Other': Zap
};

const CategoryColorMap: Record<ActionCategory, string> = {
  'Connectivity': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Sound': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'Display': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'Apps': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  'System Settings': 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
  'Variables': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Logic': 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  'File System': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'Network': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  'Root/ADB': 'text-red-400 bg-red-400/10 border-red-400/20',
  'Termux': 'text-lime-400 bg-lime-400/10 border-lime-400/20',
  'Other': 'text-pink-400 bg-pink-400/10 border-pink-400/20'
};

const PREDEFINED_TRIGGERS = [
  { group: 'Location & Sensors', items: ['Geofence Enter/Exit', 'Activity (Walking/Driving)', 'Light Sensor', 'Proximity Sensor', 'Orientation (Face Down)'] },
  { group: 'Device State', items: ['Battery Level', 'Charging State', 'Screen On/Off', 'Device Boot', 'Headset Plugged'] },
  { group: 'Connectivity', items: ['WiFi Connected/Disconnected', 'Bluetooth Device Connected', 'NFC Tag Scanned', 'Cell Tower Changed'] },
  { group: 'Apps & UI', items: ['App Opened/Closed', 'Notification Received', 'UI Element Clicked (AutoInput)', 'Clipboard Changed'] },
  { group: 'Time & Date', items: ['Time of Day', 'Day of Week', 'Calendar Event', 'Alarm Clock Ringing'] },
  { group: 'Termux', items: ['Termux Command Finished', 'Termux-API Notification Action', 'ScriptRunner Event'] },
  { group: 'Advanced', items: ['Intent Received', 'Variable Cleared/Set', 'Logcat Entry', 'Shell Command Output'] }
];

const PREDEFINED_ACTIONS = {
  'System Settings': ['Toggle Airplane Mode', 'Set Display Timeout', 'Change Immersive Mode', 'Set Default Launcher', 'Toggle Location Services (Root)'],
  'Connectivity': ['Connect to Specific WiFi', 'Send Wake-on-LAN', 'Toggle Mobile Data', 'Bluetooth Tethering', 'HTTP GET/POST Request'],
  'Sound & Display': ['Set Volume (Media/Ring/Alarm)', 'Play Ringtone', 'Set Brightness', 'Toggle Dark Mode', 'Take Screenshot'],
  'Apps': ['Launch App', 'Kill App (Root)', 'Simulate Touch (AutoInput)', 'Extract Text from Screen', 'Send Intent'],
  'Logic & Variables': ['If / Else', 'For Loop', 'Wait (ms/sec/min)', 'Set Variable (%var)', 'Parse JSON/XML'],
  'File System': ['Read/Write File', 'Delete File/Folder', 'Zip/Unzip', 'Monitor File Changes'],
  'Root/ADB': ['Run Shell Command', 'Reboot (Normal/Recovery/Bootloader)', 'Grant/Revoke Permissions', 'Modify Build.prop'],
  'Termux': ['Run Termux Script', 'Termux-API: Vibrate', 'Termux-API: Camera Photo', 'Termux-API: Location', 'Termux-API: TTS Speak', 'ScriptRunner: Execute']
};

type RiskLevel = 'Low' | 'Medium' | 'High';

interface FlowAction {
  category: ActionCategory;
  description: string;
  details?: string;
  riskLevel?: RiskLevel;
}

interface FlowConstraint {
  id: string;
  description: string;
  type: 'Screen' | 'Battery' | 'Time' | 'Location' | 'Variable';
  condition?: string;
  value?: string;
}

const TERMUX_TEMPLATES = [
  { name: 'Battery Status', content: '#!/bin/bash\ntermux-battery-status' },
  { name: 'Vibrate', content: '#!/bin/bash\ntermux-vibrate -d 500' },
  { name: 'TTS Speak', content: '#!/bin/bash\ntermux-tts-speak "Hello from Termux"' },
  { name: 'Location', content: '#!/bin/bash\ntermux-location' }
];

interface FlowVariable {
  name: string;
  type: 'String' | 'Number' | 'Boolean' | 'Array';
  initialValue: string;
}

interface Flow {
  id: string;
  title: string;
  trigger: string;
  triggerDetails?: string;
  actions: FlowAction[];
  constraints?: FlowConstraint[];
  variables?: FlowVariable[];
  isActive: boolean;
  iconName: string;
  metrics?: {
    batteryImpact: number; // 0-100
    failureRate: number; // 0-100
    lastRun: string;
  };
}

const initialFlows: Flow[] = [
  {
    id: '1',
    title: 'Advanced Car Mode',
    trigger: 'Bluetooth: "My Car"',
    variables: [
      { name: '%IN_CAR', type: 'Boolean', initialValue: 'false' },
      { name: '%LAST_LOC', type: 'String', initialValue: '' }
    ],
    actions: [
      { category: 'Variables', description: 'Set %IN_CAR to true', riskLevel: 'Low' },
      { category: 'System Settings', description: 'Set Display Timeout to Never', riskLevel: 'Medium' },
      { category: 'Apps', description: 'Launch App: Spotify', details: 'Package: com.spotify.music', riskLevel: 'Low' },
      { category: 'Logic', description: 'Wait 2 seconds', riskLevel: 'Low' },
      { category: 'Apps', description: 'Simulate Touch: Play Button', details: 'AutoInput Action', riskLevel: 'Medium' },
      { category: 'Network', description: 'HTTP GET: Notify Home Assistant', riskLevel: 'Low' }
    ],
    isActive: true,
    iconName: 'Bluetooth',
    metrics: { batteryImpact: 12, failureRate: 2, lastRun: '2 mins ago' }
  },
  {
    id: '2',
    title: 'Anti-Theft Protocol',
    trigger: 'Failed Unlock (3 times)',
    variables: [
      { name: '%THIEF_PHOTO_PATH', type: 'String', initialValue: '' },
      { name: '%CURRENT_BATT', type: 'Number', initialValue: '0' }
    ],
    actions: [
      { category: 'Other', description: 'Take Front Camera Photo', details: 'Hidden', riskLevel: 'High' },
      { category: 'Other', description: 'Get High Accuracy Location', riskLevel: 'High' },
      { category: 'Network', description: 'Send SMS to Emergency Contact', details: 'Include %LOC and %BATT', riskLevel: 'Medium' },
      { category: 'Root/ADB', description: 'Run Shell: lock_device', details: 'Requires Root', riskLevel: 'High' }
    ],
    isActive: false,
    iconName: 'ShieldAlert',
    metrics: { batteryImpact: 5, failureRate: 0, lastRun: 'Never' }
  }
];

export default function App() {
  const [flows, setFlows] = useState<Flow[]>(initialFlows);
  const [view, setView] = useState<'home' | 'create' | 'modules' | 'vault' | 'metrics'>('home');
  const [createMode, setCreateMode] = useState<'ai' | 'visual'>('visual');
  const [editingMode, setEditingMode] = useState<'wizard' | 'list' | 'canvas'>('wizard');
  const [visualTab, setVisualTab] = useState<'actions' | 'variables' | 'constraints'>('actions');
  
  // Modules State
  const [isScriptRunnerActive, setIsScriptRunnerActive] = useState(false);
  const [isTermuxAppActive, setIsTermuxAppActive] = useState(false);
  const [isParanoiaMode, setIsParanoiaMode] = useState(false);
  const [editingScript, setEditingScript] = useState<any>(null);
  const [isAddingConstraint, setIsAddingConstraint] = useState(false);
  const [newConstraintType, setNewConstraintType] = useState<'Screen' | 'Battery' | 'Time' | 'Location' | 'Variable'>('Battery');
  const [newConstraintCondition, setNewConstraintCondition] = useState('');
  const [newConstraintValue, setNewConstraintValue] = useState('');
  const [secrets, setSecrets] = useState<{id: string, name: string, value: string}[]>([
    { id: '1', name: 'HOME_ASSISTANT_TOKEN', value: '••••••••••••••••' },
    { id: '2', name: 'OPENAI_API_KEY', value: '••••••••••••••••' }
  ]);
  const [scripts, setScripts] = useState<{id: string, name: string, content: string}[]>([
    { id: '1', name: 'battery_check.sh', content: '#!/bin/bash\ntermux-battery-status' },
    { id: '2', name: 'hello_world.py', content: 'print("Hello from Termux!")' }
  ]);
  // Snap-to-Sentence Helper
  const getSnapToSentence = (flow: { trigger: string; actions: FlowAction[]; constraints: FlowConstraint[] }) => {
    if (!flow.trigger) return "Waiting for a trigger...";
    
    let sentence = `When ${flow.trigger.toLowerCase()}`;
    
    if (flow.constraints && flow.constraints.length > 0) {
      const constraintText = flow.constraints.map(c => `${c.condition || c.description} is ${c.value || 'true'}`).join(' and ');
      sentence += `, but only if ${constraintText}`;
    }
    
    if (flow.actions && flow.actions.length > 0) {
      const actionText = flow.actions.map(a => a.description.toLowerCase()).join(', then ');
      sentence += `, ${actionText}`;
    } else {
      sentence += ", do nothing yet.";
    }
    
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
  };
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Visual Builder State
  const [manualTitle, setManualTitle] = useState('');
  const [manualTrigger, setManualTrigger] = useState(PREDEFINED_TRIGGERS[0].items[0]);
  const [manualTriggerDetails, setManualTriggerDetails] = useState('');
  const [manualActions, setManualActions] = useState<FlowAction[]>([]);
  const [manualConstraints, setManualConstraints] = useState<FlowConstraint[]>([]);
  const [manualVariables, setManualVariables] = useState<FlowVariable[]>([]);
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);
  const [selectedActionGroup, setSelectedActionGroup] = useState<keyof typeof PREDEFINED_ACTIONS>('System Settings');
  const [selectedAction, setSelectedAction] = useState(PREDEFINED_ACTIONS['System Settings'][0]);
  const [actionDetails, setActionDetails] = useState('');
  const [actionRisk, setActionRisk] = useState<RiskLevel>('Low');

  // Variable Add State
  const [isAddingVariable, setIsAddingVariable] = useState(false);
  const [editingVariableIndex, setEditingVariableIndex] = useState<number | null>(null);
  const [newVarName, setNewVarName] = useState('%NEW_VAR');
  const [newVarType, setNewVarType] = useState<'String' | 'Number' | 'Boolean' | 'Array'>('String');
  const [newVarValue, setNewVarValue] = useState('');

  const toggleFlow = (id: string) => {
    setFlows(flows.map(f => f.id === id ? { ...f, isActive: !f.isActive } : f));
  };

  const deleteFlow = (id: string) => {
    setFlows(flows.filter(f => f.id !== id));
  };

  const handleExport = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(flows, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "flows_backup.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      toast.success('Flows exported successfully');
    } catch (e) {
      toast.error('Failed to export flows');
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          // Basic validation
          const validFlows = imported.filter(f => f.id && f.title && f.actions);
          setFlows(prev => [...validFlows, ...prev]);
          toast.success(`Imported ${validFlows.length} flows successfully`);
        } else {
          toast.error("Invalid JSON format");
        }
      } catch (err) {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const generateFlow = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview', // Upgraded to Pro for complex logic
        contents: `Create an extremely advanced phone automation flow (Tasker/Macrodroid level) based on this request: "${prompt}". 
        Available categories: ${Object.keys(CategoryIconMap).join(', ')}.
        Include 'Termux' category for shell scripts, python, or ScriptRunner actions.
        ScriptRunner is a secure Android bridge for Termux scripts.
        Use variables, intents, shell commands, or logic if necessary. Categorize each action accurately. Also define any necessary variables.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Short, catchy title" },
              trigger: { type: Type.STRING, description: "The condition that starts the flow (can be complex)" },
              triggerDetails: { type: Type.STRING, description: "Optional trigger parameters" },
              variables: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Variable name, starting with %" },
                    type: { type: Type.STRING, enum: ['String', 'Number', 'Boolean', 'Array'] },
                    initialValue: { type: Type.STRING }
                  },
                  required: ["name", "type", "initialValue"]
                }
              },
              actions: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    category: { 
                      type: Type.STRING, 
                      enum: ['Connectivity', 'Sound', 'Display', 'Apps', 'System Settings', 'Variables', 'Logic', 'File System', 'Network', 'Root/ADB', 'Other'],
                      description: "Category of the action" 
                    },
                    description: { type: Type.STRING, description: "Action description" },
                    details: { type: Type.STRING, description: "Technical details (e.g., variable names, shell commands, package names)" }
                  },
                  required: ["category", "description"]
                }, 
                description: "List of categorized actions" 
              },
              iconName: { type: Type.STRING, description: "One of: Zap, MapPin, Wifi, Battery, Clock, Bluetooth, Music, Moon, Smartphone, Code, ShieldAlert, FileText, Database, Network" }
            },
            required: ["title", "trigger", "actions", "iconName"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      const newFlow: Flow = {
        id: Date.now().toString(),
        title: data.title || 'New Flow',
        trigger: data.trigger || 'Manual',
        triggerDetails: data.triggerDetails || '',
        actions: data.actions || [],
        variables: data.variables || [],
        isActive: true,
        iconName: data.iconName && IconMap[data.iconName] ? data.iconName : 'Zap'
      };
      
      setFlows([newFlow, ...flows]);
      setView('home');
      setPrompt('');
      toast.success('Flow generated successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate flow. Try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveManualFlow = () => {
    if (!manualTitle.trim() || manualActions.length === 0) return;
    const newFlow: Flow = {
      id: Date.now().toString(),
      title: manualTitle,
      trigger: manualTrigger,
      triggerDetails: manualTriggerDetails.trim() ? manualTriggerDetails : undefined,
      actions: manualActions,
      constraints: manualConstraints,
      variables: manualVariables,
      isActive: true,
      iconName: 'Code',
      metrics: { batteryImpact: 0, failureRate: 0, lastRun: 'Never' }
    };
    setFlows([newFlow, ...flows]);
    setView('home');
    setManualTitle('');
    setManualActions([]);
    setManualVariables([]);
    setManualTrigger(PREDEFINED_TRIGGERS[0].items[0]);
    setVisualTab('actions');
    toast.success('Flow saved successfully!');
  };

  const addManualAction = () => {
    // Map the UI group to the internal category type
    let category: ActionCategory = 'Other';
    if (selectedActionGroup === 'System Settings') category = 'System Settings';
    if (selectedActionGroup === 'Connectivity') category = 'Connectivity';
    if (selectedActionGroup === 'Sound & Display') category = 'Display';
    if (selectedActionGroup === 'Apps') category = 'Apps';
    if (selectedActionGroup === 'Logic & Variables') category = 'Logic';
    if (selectedActionGroup === 'File System') category = 'File System';
    if (selectedActionGroup === 'Root/ADB') category = 'Root/ADB';

    setManualActions([...manualActions, { 
      category, 
      description: selectedAction,
      details: actionDetails.trim() ? actionDetails : undefined
    }]);
    setActionDetails('');
    setIsAddingAction(false);
  };

  const startEditAction = (idx: number) => {
    const action = manualActions[idx];
    // Find the group for the category
    let group: keyof typeof PREDEFINED_ACTIONS = 'System Settings';
    if (action.category === 'System Settings') group = 'System Settings';
    else if (action.category === 'Connectivity') group = 'Connectivity';
    else if (action.category === 'Display') group = 'Sound & Display';
    else if (action.category === 'Apps') group = 'Apps';
    else if (action.category === 'Logic') group = 'Logic & Variables';
    else if (action.category === 'File System') group = 'File System';
    else if (action.category === 'Root/ADB') group = 'Root/ADB';

    setSelectedActionGroup(group);
    setSelectedAction(action.description);
    setActionDetails(action.details || '');
    setEditingActionIndex(idx);
    setIsAddingAction(false);
  };

  const saveEditedAction = () => {
    if (editingActionIndex === null) return;
    let category: ActionCategory = 'Other';
    if (selectedActionGroup === 'System Settings') category = 'System Settings';
    if (selectedActionGroup === 'Connectivity') category = 'Connectivity';
    if (selectedActionGroup === 'Sound & Display') category = 'Display';
    if (selectedActionGroup === 'Apps') category = 'Apps';
    if (selectedActionGroup === 'Logic & Variables') category = 'Logic';
    if (selectedActionGroup === 'File System') category = 'File System';
    if (selectedActionGroup === 'Root/ADB') category = 'Root/ADB';

    const newActions = [...manualActions];
    newActions[editingActionIndex] = {
      category,
      description: selectedAction,
      details: actionDetails.trim() ? actionDetails : undefined
    };
    setManualActions(newActions);
    setEditingActionIndex(null);
    setActionDetails('');
  };

  const addManualConstraint = () => {
    if (!newConstraintCondition.trim()) return;
    setManualConstraints([...manualConstraints, {
      id: Date.now().toString(),
      description: `${newConstraintType}: ${newConstraintCondition} is ${newConstraintValue}`,
      type: newConstraintType,
      condition: newConstraintCondition,
      value: newConstraintValue
    }]);
    setNewConstraintCondition('');
    setNewConstraintValue('');
    setIsAddingConstraint(false);
  };

  const addManualVariable = () => {
    if (!newVarName.trim()) return;
    setManualVariables([...manualVariables, {
      name: newVarName.startsWith('%') ? newVarName : `%${newVarName}`,
      type: newVarType,
      initialValue: newVarValue
    }]);
    setNewVarName('%NEW_VAR');
    setNewVarType('String');
    setNewVarValue('');
    setIsAddingVariable(false);
  };

  const startEditVariable = (idx: number) => {
    const variable = manualVariables[idx];
    setNewVarName(variable.name);
    setNewVarType(variable.type);
    setNewVarValue(variable.initialValue);
    setEditingVariableIndex(idx);
    setIsAddingVariable(false);
  };

  const saveEditedVariable = () => {
    if (editingVariableIndex === null) return;
    if (!newVarName.trim()) return;
    
    const oldName = manualVariables[editingVariableIndex].name;
    const newName = newVarName.startsWith('%') ? newVarName : `%${newVarName}`;

    const newVariables = [...manualVariables];
    newVariables[editingVariableIndex] = {
      name: newName,
      type: newVarType,
      initialValue: newVarValue
    };
    setManualVariables(newVariables);

    // Update variable references in actions
    if (oldName !== newName) {
      const updatedActions = manualActions.map(action => {
        if (action.details && action.details.includes(oldName)) {
          return { ...action, details: action.details.replace(new RegExp(oldName, 'g'), newName) };
        }
        return action;
      });
      setManualActions(updatedActions);
    }

    setEditingVariableIndex(null);
    setNewVarName('%NEW_VAR');
    setNewVarType('String');
    setNewVarValue('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4 font-sans">
      <Toaster theme="dark" position="bottom-center" />
      <div className="w-full max-w-[400px] h-[800px] max-h-[90vh] bg-zinc-950 rounded-[3rem] overflow-hidden border-[8px] border-zinc-900 shadow-2xl relative flex flex-col">
        
        {/* Status Bar Mock */}
        <div className="h-12 w-full flex items-center justify-between px-6 text-zinc-400 text-xs font-medium z-10 shrink-0">
          <span>12:00</span>
          <div className="flex items-center gap-2">
            <Wifi size={14} />
            <Battery size={14} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {view === 'home' ? (
            <motion.div 
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col p-6 pt-2 overflow-y-auto pb-24"
            >
              <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl pt-4 pb-4 px-6 -mx-6 mb-6 flex items-center justify-between border-b border-zinc-800/50">
                <h1 className="text-3xl font-semibold text-white tracking-tight">Flows</h1>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setView('metrics')}
                    className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
                  >
                    <BarChart3 size={20} />
                  </button>
                  <button 
                    onClick={() => setView('vault')}
                    className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
                  >
                    <Lock size={20} />
                  </button>
                  <button 
                    onClick={() => setView('modules')}
                    className={`p-2 rounded-full transition-colors ${isScriptRunnerActive ? 'bg-lime-500/20 text-lime-400' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                  >
                    <Terminal size={20} />
                  </button>
                  <label className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer">
                    <Upload size={20} />
                    <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                  </label>
                  <button onClick={handleExport} className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors">
                    <Download size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {flows.map(flow => {
                  const Icon = IconMap[flow.iconName] || Zap;
                  return (
                    <div key={flow.id} className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-5 backdrop-blur-sm transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-2xl ${flow.isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-400'}`}>
                            <Icon size={24} />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-white">{flow.title}</h3>
                            <p className="text-sm text-zinc-400">{flow.trigger}</p>
                            {flow.triggerDetails && (
                              <p className="text-xs text-zinc-500 mt-1 font-mono italic">{flow.triggerDetails}</p>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleFlow(flow.id)}
                          className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${flow.isActive ? 'bg-blue-500' : 'bg-zinc-700'}`}
                        >
                          <motion.div 
                            layout
                            className="w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm"
                            animate={{ left: flow.isActive ? '24px' : '4px' }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        </button>
                      </div>

                      {flow.variables && flow.variables.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-2">
                          {flow.variables.map((v, i) => (
                            <span key={i} className="px-2 py-1 bg-orange-400/10 text-orange-400 border border-orange-400/20 rounded-md text-xs font-mono">
                              {v.name}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-4 relative z-10">
                        <div className="flex items-center gap-1.5">
                          <Activity size={12} />
                          <span>{flow.actions.length} Actions</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Database size={12} />
                          <span>{flow.variables?.length || 0} Vars</span>
                        </div>
                        {flow.metrics && (
                          <div className="flex items-center gap-1.5 text-lime-500/70">
                            <Zap size={12} />
                            <span>{flow.metrics.batteryImpact}% Impact</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 mt-4">
                        {flow.actions.map((action, idx) => {
                          const CatIcon = CategoryIconMap[action.category] || Zap;
                          const colorClass = CategoryColorMap[action.category] || CategoryColorMap['Other'];
                          return (
                            <div key={idx} className="flex items-start gap-3 text-sm text-zinc-300 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800/50 relative overflow-hidden">
                              <div className={`p-1.5 rounded-lg border mt-0.5 ${colorClass}`}>
                                <CatIcon size={14} />
                              </div>
                              <div className="flex-1">
                                <span className="block leading-tight">{action.description}</span>
                                {action.details && (
                                  <span className="block text-xs text-zinc-500 mt-1 font-mono">{action.details}</span>
                                )}
                              </div>
                              {action.riskLevel && (
                                <div className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-tighter border ${
                                  action.riskLevel === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                  action.riskLevel === 'Medium' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                  'bg-lime-500/10 text-lime-500 border-lime-500/20'
                                }`}>
                                  {action.riskLevel}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-end">
                        <button onClick={() => deleteFlow(flow.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {flows.length === 0 && (
                  <div className="text-center py-12 text-zinc-500">
                    <Sparkles size={32} className="mx-auto mb-4 opacity-50" />
                    <p>No flows yet. Create one!</p>
                  </div>
                )}
              </div>

              {/* FAB */}
              <button 
                onClick={() => setView('create')}
                className="absolute bottom-10 right-8 w-16 h-16 bg-blue-500 hover:bg-blue-400 text-white rounded-full shadow-lg shadow-blue-500/20 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-20"
              >
                <Plus size={28} />
              </button>
            </motion.div>
          ) : view === 'vault' ? (
            <motion.div 
              key="vault"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex-1 flex flex-col pt-10 pb-10 overflow-hidden"
            >
              <div className="px-6 mb-8 flex items-center gap-4 shrink-0">
                <button 
                  onClick={() => setView('home')}
                  className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-3xl font-semibold text-white tracking-tight">Secrets Vault</h1>
              </div>

              <div className="flex-1 overflow-y-auto px-6 space-y-6">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3 text-zinc-400">
                      <Shield size={24} className="text-lime-400" />
                      <h2 className="text-lg font-medium text-white">Paranoia Mode</h2>
                    </div>
                    <button 
                      onClick={() => setIsParanoiaMode(!isParanoiaMode)}
                      className={`w-12 h-6 rounded-full transition-all relative ${isParanoiaMode ? 'bg-lime-500' : 'bg-zinc-800'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${isParanoiaMode ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    When enabled, all secrets are AES-256 encrypted locally. Accessing or editing flows with high-risk nodes will require biometric authentication.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Saved Secrets</h3>
                    <button className="text-blue-400 text-xs font-bold hover:text-blue-300 transition-colors">Add New</button>
                  </div>

                  {Object.entries(secrets).map(([key, value]) => (
                    <div key={key} className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500">
                          <Lock size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{key}</p>
                          <p className="text-xs text-zinc-600 font-mono">••••••••••••••••</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-zinc-500 hover:text-white transition-colors">
                          <Eye size={16} />
                        </button>
                        <button className="p-2 text-zinc-500 hover:text-red-400 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : view === 'metrics' ? (
            <motion.div 
              key="metrics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex-1 flex flex-col pt-10 pb-10 overflow-hidden"
            >
              <div className="px-6 mb-8 flex items-center gap-4 shrink-0">
                <button 
                  onClick={() => setView('home')}
                  className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-3xl font-semibold text-white tracking-tight">System Metrics</h1>
              </div>

              <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Avg Battery Impact</p>
                    <p className="text-3xl font-bold text-lime-400">4.2%</p>
                    <p className="text-[10px] text-zinc-600 mt-2">Last 24 hours</p>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Success Rate</p>
                    <p className="text-3xl font-bold text-blue-400">98.5%</p>
                    <p className="text-[10px] text-zinc-600 mt-2">1,240 executions</p>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Execution History</h3>
                  <div className="space-y-6">
                    {[
                      { flow: 'Advanced Car Mode', time: '2 mins ago', status: 'success', impact: '0.2%' },
                      { flow: 'Anti-Theft Protocol', time: '1 hour ago', status: 'standby', impact: '0.01%' },
                      { flow: 'Home Wi-Fi Sync', time: '3 hours ago', status: 'failure', impact: '0.1%' },
                      { flow: 'Advanced Car Mode', time: '5 hours ago', status: 'success', impact: '0.2%' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-lime-500' : item.status === 'failure' ? 'bg-red-500' : 'bg-zinc-600'}`} />
                          <div>
                            <p className="text-sm font-medium text-white">{item.flow}</p>
                            <p className="text-xs text-zinc-500">{item.time}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono text-zinc-400">{item.impact}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-widest ${item.status === 'success' ? 'text-lime-500/50' : item.status === 'failure' ? 'text-red-500/50' : 'text-zinc-600'}`}>
                            {item.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Resource Distribution</h3>
                  <div className="h-4 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-500 w-[40%]" />
                    <div className="h-full bg-lime-500 w-[30%]" />
                    <div className="h-full bg-purple-500 w-[20%]" />
                    <div className="h-full bg-zinc-700 w-[10%]" />
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 mt-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-xs text-zinc-400">Network (40%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-lime-500" />
                      <span className="text-xs text-zinc-400">Sensors (30%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-xs text-zinc-400">UI Automation (20%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-zinc-700" />
                      <span className="text-xs text-zinc-400">Other (10%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : view === 'modules' ? (
            <motion.div 
              key="modules"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col p-6 overflow-y-auto"
            >
              <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => setView('home')}
                  className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Modules</h1>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-lime-500/20 text-lime-400 rounded-2xl">
                      <Terminal size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">ScriptRunner</h3>
                      <p className="text-xs text-zinc-500">Termux Automation Bridge</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsScriptRunnerActive(!isScriptRunnerActive);
                      toast.success(`ScriptRunner ${!isScriptRunnerActive ? 'activated' : 'deactivated'}`);
                    }}
                    className={`w-12 h-7 rounded-full transition-colors relative ${isScriptRunnerActive ? 'bg-lime-500' : 'bg-zinc-700'}`}
                  >
                    <motion.div 
                      layout
                      className="w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm"
                      animate={{ left: isScriptRunnerActive ? '24px' : '4px' }}
                    />
                  </button>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                  Manage and execute scripts via Termux securely. Supports environment variables, background execution, and monitoring.
                </p>
                
                {isScriptRunnerActive && (
                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Your Scripts</h4>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-zinc-500 hover:text-white cursor-pointer flex items-center gap-1">
                          <Upload size={12} /> Import
                          <input 
                            type="file" 
                            accept=".json" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                try {
                                  const imported = JSON.parse(event.target?.result as string);
                                  if (Array.isArray(imported)) {
                                    setScripts([...scripts, ...imported]);
                                    toast.success(`Imported ${imported.length} scripts`);
                                  }
                                } catch (err) {
                                  toast.error('Invalid script file');
                                }
                              };
                              reader.readAsText(file);
                            }} 
                          />
                        </label>
                        <button 
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(scripts, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'termux_scripts.json';
                            a.click();
                            toast.success('Scripts exported');
                          }}
                          className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
                        >
                          <Download size={12} /> Export
                        </button>
                        <button 
                          onClick={() => setEditingScript({ 
                            id: Date.now().toString(), 
                            name: 'new_script.sh', 
                            content: '#!/bin/bash\n',
                            executionMode: 'background',
                            prefix: 'bash',
                            args: '',
                            envVars: '',
                            qsTile: false,
                            autoRestart: false
                          })}
                          className="text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1 ml-2"
                        >
                          <Plus size={14} /> New
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {scripts.map(script => (
                        <div key={script.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <FileText size={16} className="text-zinc-500" />
                            <span className="text-sm text-zinc-300 font-mono">{script.name}</span>
                          </div>
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingScript(script)} className="p-1.5 text-zinc-500 hover:text-white"><Edit2 size={14} /></button>
                                    <button onClick={() => setScripts(scripts.filter(s => s.id !== script.id))} className="p-1.5 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                                  </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl">
                      <Smartphone size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Termux app</h3>
                      <p className="text-xs text-zinc-500">Android Terminal Emulator</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsTermuxAppActive(!isTermuxAppActive);
                      toast.success(`Termux app ${!isTermuxAppActive ? 'linked' : 'unlinked'}`);
                    }}
                    className={`w-12 h-7 rounded-full transition-colors relative ${isTermuxAppActive ? 'bg-blue-500' : 'bg-zinc-700'}`}
                  >
                    <motion.div 
                      layout
                      className="w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm"
                      animate={{ left: isTermuxAppActive ? '24px' : '4px' }}
                    />
                  </button>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                  The core terminal environment. Link your Termux installation to enable advanced shell commands and package management.
                </p>
                
                {isTermuxAppActive && (
                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Status</p>
                        <div className="text-sm text-lime-400 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-lime-400 rounded-full animate-pulse" />
                          Connected
                        </div>
                      </div>
                      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Packages</p>
                        <p className="text-sm text-white">42 Installed</p>
                      </div>
                    </div>
                    <button className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                      <Terminal size={16} /> Open Terminal
                    </button>
                  </div>
                )}
              </div>

              {editingScript && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-xl p-6 flex flex-col overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-6 sticky top-0 bg-zinc-950/80 backdrop-blur-md py-2 z-10">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setEditingScript(null)} className="p-2 text-zinc-400 hover:text-white"><ArrowLeft size={24} /></button>
                        <input 
                          type="text" 
                          value={editingScript.name}
                          onChange={(e) => setEditingScript({...editingScript, name: e.target.value})}
                          className="bg-transparent text-xl font-mono text-white focus:outline-none border-b border-zinc-800 pb-1 w-48"
                        />
                      </div>
                    <button 
                      onClick={() => {
                        const exists = scripts.find(s => s.id === editingScript.id);
                        if (exists) {
                          setScripts(scripts.map(s => s.id === editingScript.id ? editingScript : s));
                        } else {
                          setScripts([...scripts, editingScript]);
                        }
                        setEditingScript(null);
                        toast.success('Script saved');
                      }}
                      className="p-3 bg-lime-500 hover:bg-lime-400 text-black rounded-full"
                    >
                      <Save size={20} />
                    </button>
                  </div>

                  <div className="space-y-6 pb-24">
                    <section>
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Script Content</h4>
                      <textarea 
                        value={editingScript.content}
                        onChange={(e) => setEditingScript({...editingScript, content: e.target.value})}
                        className="w-full h-64 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-lime-400 font-mono text-sm focus:outline-none resize-none"
                        spellCheck={false}
                      />
                    </section>

                    <section className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Execution</h4>
                        <select 
                          value={editingScript.executionMode}
                          onChange={(e) => setEditingScript({...editingScript, executionMode: e.target.value as any})}
                          className="w-full bg-zinc-800 text-white rounded-lg p-2 text-sm focus:outline-none"
                        >
                          <option value="background">Background</option>
                          <option value="interactive">Interactive</option>
                        </select>
                      </div>
                      <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Prefix</h4>
                        <input 
                          type="text" 
                          value={editingScript.prefix}
                          placeholder="e.g. bash, python"
                          onChange={(e) => setEditingScript({...editingScript, prefix: e.target.value})}
                          className="w-full bg-zinc-800 text-white rounded-lg p-2 text-sm focus:outline-none"
                        />
                      </div>
                    </section>

                    <section className="space-y-4">
                      <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Arguments</h4>
                        <input 
                          type="text" 
                          value={editingScript.args}
                          placeholder="--verbose --force"
                          onChange={(e) => setEditingScript({...editingScript, args: e.target.value})}
                          className="w-full bg-zinc-800 text-white rounded-lg p-2 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Env Variables</h4>
                        <textarea 
                          value={editingScript.envVars}
                          placeholder="KEY=VALUE"
                          onChange={(e) => setEditingScript({...editingScript, envVars: e.target.value})}
                          className="w-full h-20 bg-zinc-800 text-white rounded-lg p-2 text-sm focus:outline-none resize-none"
                        />
                      </div>
                    </section>

                    <section className="flex flex-col gap-3">
                      <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                        <div>
                          <h4 className="text-sm font-medium text-white">Quick Settings Tile</h4>
                          <p className="text-xs text-zinc-500">Add to Android QS panel</p>
                        </div>
                        <button 
                          onClick={() => setEditingScript({...editingScript, qsTile: !editingScript.qsTile})}
                          className={`w-10 h-6 rounded-full transition-colors relative ${editingScript.qsTile ? 'bg-lime-500' : 'bg-zinc-700'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${editingScript.qsTile ? 'left-5' : 'left-1'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                        <div>
                          <h4 className="text-sm font-medium text-white">Auto-Restart</h4>
                          <p className="text-xs text-zinc-500">Restart on failure (Experimental)</p>
                        </div>
                        <button 
                          onClick={() => setEditingScript({...editingScript, autoRestart: !editingScript.autoRestart})}
                          className={`w-10 h-6 rounded-full transition-colors relative ${editingScript.autoRestart ? 'bg-lime-500' : 'bg-zinc-700'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${editingScript.autoRestart ? 'left-5' : 'left-1'}`} />
                        </button>
                      </div>
                    </section>

                    <section>
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Templates</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {TERMUX_TEMPLATES.map(t => (
                          <button 
                            key={t.name}
                            onClick={() => setEditingScript({...editingScript, content: t.content, name: t.name.toLowerCase().replace(' ', '_') + '.sh'})}
                            className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-all text-left"
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col pt-2 pb-10 overflow-hidden"
            >
              <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl pt-4 pb-4 px-6 flex items-center gap-4 border-b border-zinc-800/50 shrink-0">
                <button 
                  onClick={() => setView('home')}
                  className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-semibold text-white tracking-tight">New Flow</h1>
              </div>

              {/* Mode Toggle */}
              <div className="px-6 py-4 shrink-0 space-y-4">
                <div className="flex p-1 bg-zinc-900 rounded-2xl">
                  <button 
                    onClick={() => setCreateMode('visual')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all ${createMode === 'visual' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <GitCommit size={16} />
                    Visual
                  </button>
                  <button 
                    onClick={() => setCreateMode('ai')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all ${createMode === 'ai' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <Wand2 size={16} />
                    Magic AI
                  </button>
                </div>

                {createMode === 'visual' && (
                  <div className="flex p-1 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                    <button 
                      onClick={() => setEditingMode('wizard')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${editingMode === 'wizard' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                    >
                      Wizard
                    </button>
                    <button 
                      onClick={() => setEditingMode('list')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${editingMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                    >
                      List
                    </button>
                    <button 
                      onClick={() => setEditingMode('canvas')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${editingMode === 'canvas' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                    >
                      Canvas
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6">
                {createMode === 'visual' && (
                  <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                      <Sparkles size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Snap-to-Sentence</span>
                    </div>
                    <p className="text-sm text-zinc-300 italic leading-relaxed">
                      "{getSnapToSentence({ trigger: manualTrigger, actions: manualActions, constraints: manualConstraints })}"
                    </p>
                  </div>
                )}
                <AnimatePresence mode="wait">
                  {createMode === 'ai' ? (
                    <motion.div 
                      key="ai-mode"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col h-full"
                    >
                      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-3xl p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4 text-blue-400">
                          <Sparkles size={24} />
                          <h2 className="text-lg font-medium">Describe your flow</h2>
                        </div>
                        <p className="text-sm text-zinc-400 mb-6">
                          Tell Gemini what you want to automate. It understands complex logic, variables, intents, and shell commands.
                        </p>
                        
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="E.g., If I receive an SMS containing 'Where are you?', get my GPS location, reverse geocode it, and reply with the address..."
                          className="w-full h-32 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                        />
                      </div>

                      <div className="mt-auto pt-4">
                        <button 
                          onClick={generateFlow}
                          disabled={!prompt.trim() || isGenerating}
                          className="w-full py-4 bg-blue-500 hover:bg-blue-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-2xl font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 size={20} className="animate-spin" />
                              Building Advanced Flow...
                            </>
                          ) : (
                            <>
                              <Sparkles size={20} />
                              Generate Flow
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="visual-mode"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col min-h-full pb-4"
                    >
                      <div className="space-y-4">
                        {/* Title Input */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                          <input 
                            type="text" 
                            placeholder="Flow Title (e.g. Server Ping Check)"
                            value={manualTitle}
                            onChange={(e) => setManualTitle(e.target.value)}
                            className="w-full bg-transparent text-white text-lg font-medium placeholder:text-zinc-600 focus:outline-none"
                          />
                        </div>

                        {/* Visual Builder Tabs */}
                        <div className="flex border-b border-zinc-800 mb-6">
                          <button 
                            onClick={() => setVisualTab('actions')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${visualTab === 'actions' ? 'border-blue-500 text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                          >
                            Flow Logic
                          </button>
                          <button 
                            onClick={() => setVisualTab('variables')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${visualTab === 'variables' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                          >
                            <Braces size={16} />
                            Variables ({manualVariables.length})
                          </button>
                        </div>

                        {visualTab === 'actions' ? (
                          <div className="space-y-6">
                            {editingMode === 'wizard' ? (
                              <div className="space-y-8 relative">
                                {/* Trigger Section */}
                                <div className="relative">
                                  <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-zinc-800" />
                                  <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 relative z-10">
                                      <Zap size={24} />
                                    </div>
                                    <div>
                                      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Trigger</h3>
                                      <p className="text-lg font-medium text-white">{manualTrigger}</p>
                                    </div>
                                  </div>
                                  <div className="ml-16 space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                      {PREDEFINED_TRIGGERS.map(group => (
                                        group.items.map(item => (
                                          <button 
                                            key={item}
                                            onClick={() => setManualTrigger(item)}
                                            className={`p-3 rounded-xl border text-xs transition-all text-left ${manualTrigger === item ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                                          >
                                            {item}
                                          </button>
                                        ))
                                      ))}
                                    </div>
                                    <input 
                                      type="text" 
                                      value={manualTriggerDetails}
                                      onChange={(e) => setManualTriggerDetails(e.target.value)}
                                      placeholder="Trigger parameters (e.g. Device Name, SSID...)"
                                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                  </div>
                                </div>

                                {/* Constraints Section */}
                                <div className="relative">
                                  <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-zinc-800" />
                                  <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20 relative z-10">
                                      <Shield size={24} />
                                    </div>
                                    <div>
                                      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Constraints</h3>
                                      <p className="text-lg font-medium text-white">{manualConstraints.length} Active</p>
                                    </div>
                                  </div>
                                  <div className="ml-16 space-y-3">
                                    {manualConstraints.map((c, i) => (
                                      <div key={i} className="flex items-center justify-between bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                                        <span className="text-sm text-zinc-300">{c.condition || c.description} is {c.value || 'true'}</span>
                                        <button onClick={() => setManualConstraints(manualConstraints.filter((_, idx) => idx !== i))} className="text-zinc-600 hover:text-red-400">
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    ))}

                                    {isAddingConstraint && (
                                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                                        <div className="flex gap-2">
                                          <div className="relative flex-1">
                                            <select 
                                              value={newConstraintType}
                                              onChange={(e) => setNewConstraintType(e.target.value as any)}
                                              className="w-full bg-zinc-950 border border-zinc-800 text-white p-3 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                            >
                                              <option value="Battery">Battery</option>
                                              <option value="Screen">Screen</option>
                                              <option value="Time">Time</option>
                                              <option value="Location">Location</option>
                                              <option value="Variable">Variable</option>
                                            </select>
                                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                          </div>
                                          <input 
                                            type="text"
                                            placeholder="Condition (e.g. Level)"
                                            value={newConstraintCondition}
                                            onChange={(e) => setNewConstraintCondition(e.target.value)}
                                            className="flex-1 bg-zinc-950 border border-zinc-800 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                          />
                                        </div>
                                        <input 
                                          type="text"
                                          placeholder="Value (e.g. < 20)"
                                          value={newConstraintValue}
                                          onChange={(e) => setNewConstraintValue(e.target.value)}
                                          className="w-full bg-zinc-950 border border-zinc-800 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        />
                                        <div className="flex gap-2 pt-2">
                                          <button 
                                            onClick={addManualConstraint}
                                            className="flex-1 bg-orange-500 hover:bg-orange-400 text-white py-2 rounded-xl font-medium transition-colors"
                                          >
                                            Add
                                          </button>
                                          <button 
                                            onClick={() => {
                                              setIsAddingConstraint(false);
                                              setNewConstraintCondition('');
                                              setNewConstraintValue('');
                                            }}
                                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-xl font-medium transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {!isAddingConstraint && (
                                      <button 
                                        onClick={() => setIsAddingConstraint(true)}
                                        className="w-full py-3 border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all flex items-center justify-center gap-2"
                                      >
                                        <Plus size={14} />
                                        Add Constraint
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Actions Section */}
                                <div className="relative">
                                  <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-lime-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-lime-500/20 relative z-10">
                                      <Activity size={24} />
                                    </div>
                                    <div>
                                      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Actions</h3>
                                      <p className="text-lg font-medium text-white">{manualActions.length} Steps</p>
                                    </div>
                                  </div>
                                  <div className="ml-16 space-y-3">
                                    {manualActions.map((a, i) => (
                                      <div key={i} className="flex items-center justify-between bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                                        <div className="flex items-center gap-3">
                                          <div className={`w-2 h-2 rounded-full ${a.riskLevel === 'High' ? 'bg-red-500' : a.riskLevel === 'Medium' ? 'bg-orange-500' : 'bg-lime-500'}`} />
                                          <span className="text-sm text-zinc-300">{a.description}</span>
                                        </div>
                                        <button onClick={() => setManualActions(manualActions.filter((_, idx) => idx !== i))} className="text-zinc-600 hover:text-red-400">
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    ))}
                                    <button 
                                      onClick={() => setIsAddingAction(true)}
                                      className="w-full py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-medium text-white hover:border-zinc-700 transition-all flex items-center justify-center gap-2"
                                    >
                                      <Plus size={18} />
                                      Add Action
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : editingMode === 'list' ? (
                              <div className="space-y-4">
                                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
                                  <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Logic Tree</h3>
                                    <div className="flex gap-2">
                                      <button className="p-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"><Search size={14} /></button>
                                      <button className="p-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"><Replace size={14} /></button>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
                                      <Zap size={16} className="text-blue-400" />
                                      <span className="text-sm font-medium text-blue-400">IF: {manualTrigger}</span>
                                    </div>
                                    
                                    <div className="ml-4 pl-4 border-l-2 border-zinc-800 space-y-2">
                                      {manualConstraints.map((c, i) => (
                                        <div key={i} className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center gap-3">
                                          <Shield size={16} className="text-orange-400" />
                                          <span className="text-sm text-orange-400">AND: {c.condition || c.description} == {c.value || 'true'}</span>
                                        </div>
                                      ))}
                                      
                                      {manualActions.map((a, i) => (
                                        <div key={i} className="p-3 bg-zinc-800/50 border border-zinc-800 rounded-xl flex items-center justify-between group">
                                          <div className="flex items-center gap-3">
                                            <Activity size={16} className="text-zinc-500" />
                                            <span className="text-sm text-zinc-300">{a.description}</span>
                                          </div>
                                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="text-zinc-500 hover:text-white"><Edit2 size={14} /></button>
                                            <button className="text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                                          </div>
                                        </div>
                                      ))}
                                      
                                      <button 
                                        onClick={() => setIsAddingAction(true)}
                                        className="w-full py-2 border border-dashed border-zinc-800 rounded-xl text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-2"
                                      >
                                        <Plus size={12} />
                                        Insert Step
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
                                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Variables</h3>
                                  <div className="grid grid-cols-2 gap-3">
                                    {manualVariables.map((v, i) => (
                                      <div key={i} className="p-3 bg-zinc-800 rounded-xl flex items-center justify-between">
                                        <span className="text-xs font-mono text-orange-400">{v.name}</span>
                                        <span className="text-[10px] text-zinc-500">{v.type}</span>
                                      </div>
                                    ))}
                                    <button 
                                      onClick={() => setIsAddingVariable(true)}
                                      className="p-3 border border-dashed border-zinc-800 rounded-xl text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-2"
                                    >
                                      <Plus size={12} />
                                      New Var
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="h-[400px] bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden relative group">
                                <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px]" />
                                <Stage width={800} height={400} className="relative z-10">
                                  <Layer>
                                    {/* Trigger Node */}
                                    <Rect x={50} y={150} width={150} height={80} fill="#18181b" stroke="#3b82f6" strokeWidth={2} cornerRadius={12} />
                                    <Text x={65} y={165} text="TRIGGER" fontSize={10} fill="#3b82f6" fontStyle="bold" />
                                    <Text x={65} y={185} text={manualTrigger} fontSize={14} fill="white" />
                                    
                                    {/* Connection Line */}
                                    <Line points={[200, 190, 300, 190]} stroke="#27272a" strokeWidth={2} />
                                    
                                    {/* Action Node */}
                                    <Rect x={300} y={150} width={150} height={80} fill="#18181b" stroke="#84cc16" strokeWidth={2} cornerRadius={12} />
                                    <Text x={315} y={165} text="ACTION" fontSize={10} fill="#84cc16" fontStyle="bold" />
                                    <Text x={315} y={185} text={manualActions[0]?.description || 'Add Action'} fontSize={12} fill="white" />
                                    
                                    {manualActions.length > 1 && (
                                      <>
                                        <Line points={[450, 190, 550, 190]} stroke="#27272a" strokeWidth={2} />
                                        <Rect x={550} y={150} width={150} height={80} fill="#18181b" stroke="#84cc16" strokeWidth={2} cornerRadius={12} />
                                        <Text x={565} y={165} text="ACTION" fontSize={10} fill="#84cc16" fontStyle="bold" />
                                        <Text x={565} y={185} text={manualActions[1]?.description} fontSize={12} fill="white" />
                                      </>
                                    )}
                                  </Layer>
                                </Stage>
                                <div className="absolute bottom-4 right-4 z-20 flex gap-2">
                                  <button className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white shadow-xl"><Search size={16} /></button>
                                  <button className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white shadow-xl"><History size={16} /></button>
                                </div>
                                <div className="absolute top-4 left-4 z-20">
                                  <span className="px-3 py-1 bg-zinc-800/80 backdrop-blur-sm border border-zinc-700 rounded-full text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Canvas Editor (Beta)</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : visualTab === 'variables' ? (
                          <div className="space-y-4">
                            {manualVariables.map((v, idx) => (
                              <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-orange-400 font-mono font-bold">{v.name}</span>
                                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">{v.type}</span>
                                  </div>
                                  <div className="text-sm text-zinc-500 font-mono">
                                    Initial: {v.initialValue || '""'}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => startEditVariable(idx)}
                                    className="text-zinc-600 hover:text-blue-400 p-2 transition-colors"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button 
                                    onClick={() => setManualVariables(manualVariables.filter((_, i) => i !== idx))}
                                    className="text-zinc-600 hover:text-red-400 p-2 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}

                            {(isAddingVariable || editingVariableIndex !== null) ? (
                              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                                <div className="flex gap-2">
                                  <input 
                                    type="text"
                                    value={newVarName}
                                    onChange={(e) => setNewVarName(e.target.value)}
                                    className="flex-1 bg-zinc-950 border border-zinc-800 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono"
                                  />
                                  <div className="relative w-1/3">
                                    <select 
                                      value={newVarType}
                                      onChange={(e) => setNewVarType(e.target.value as any)}
                                      className="w-full bg-zinc-950 border border-zinc-800 text-white p-3 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    >
                                      <option value="String">String</option>
                                      <option value="Number">Number</option>
                                      <option value="Boolean">Boolean</option>
                                      <option value="Array">Array</option>
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                  </div>
                                </div>
                                <input 
                                  type="text"
                                  placeholder="Initial Value (optional)"
                                  value={newVarValue}
                                  onChange={(e) => setNewVarValue(e.target.value)}
                                  className="w-full bg-zinc-950 border border-zinc-800 text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono"
                                />
                                <div className="flex gap-2 pt-2">
                                  <button 
                                    onClick={editingVariableIndex !== null ? saveEditedVariable : addManualVariable}
                                    className="flex-1 bg-orange-500 hover:bg-orange-400 text-white py-2 rounded-xl font-medium transition-colors"
                                  >
                                    {editingVariableIndex !== null ? 'Save Changes' : 'Add Variable'}
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setIsAddingVariable(false);
                                      setEditingVariableIndex(null);
                                      setNewVarName('%NEW_VAR');
                                      setNewVarType('String');
                                      setNewVarValue('');
                                    }}
                                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-xl font-medium transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setIsAddingVariable(true)}
                                className="w-full py-4 border-2 border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 rounded-2xl text-zinc-500 hover:text-zinc-300 font-medium flex items-center justify-center gap-2 transition-all"
                              >
                                <Plus size={20} />
                                Add Variable
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {manualConstraints.map((c, idx) => (
                              <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Shield size={16} className="text-orange-400" />
                                  <span className="text-sm text-zinc-300 font-medium">{c.condition || c.description}</span>
                                  <span className="text-xs text-zinc-500">is {c.value || 'true'}</span>
                                </div>
                                <button 
                                  onClick={() => setManualConstraints(manualConstraints.filter((_, i) => i !== idx))}
                                  className="text-zinc-600 hover:text-red-400 p-2 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                            <button 
                              onClick={() => setIsAddingConstraint(true)}
                              className="w-full py-4 border-2 border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 rounded-2xl text-zinc-500 hover:text-zinc-300 font-medium flex items-center justify-center gap-2 transition-all"
                            >
                              <Plus size={20} />
                              Add Constraint
                            </button>
                          </div>
                        )}
    {/* Action Buttons */}
    <div className="flex gap-4 pt-4">
      <button 
        onClick={saveManualFlow}
        disabled={!manualTitle || manualActions.length === 0}
        className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
      >
        <Save size={20} /> Save Flow
      </button>
      <button 
        onClick={() => setView('home')}
        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-2xl font-bold text-lg transition-all"
      >
        Cancel
      </button>
    </div>
  </div>
  </motion.div>
)}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Home Indicator Mock */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-zinc-800 rounded-full z-20" />
      </div>
    </div>
  );
}
