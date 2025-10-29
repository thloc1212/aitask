
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
// FIX: Use specific subpath imports for date-fns to resolve module errors.
import { format } from 'date-fns/format';
import { addDays } from 'date-fns/addDays';
import { startOfWeek } from 'date-fns/startOfWeek';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { isSameDay } from 'date-fns/isSameDay';
import { parseISO } from 'date-fns/parseISO';
import { addWeeks } from 'date-fns/addWeeks';
import { subWeeks } from 'date-fns/subWeeks';
import { vi } from 'date-fns/locale/vi';

// --- STYLES ---
const style = document.createElement('style');
document.head.appendChild(style);
style.textContent = `
    :root {
        --background-primary: #f8f9fa;
        --background-secondary: #ffffff;
        --text-primary: #212529;
        --text-secondary: #6c757d;
        --border-color: #dee2e6;
        --accent-color: #0d6efd;
        --accent-color-light: #e7f1ff;
        --accent-text-color: #ffffff;
        --success-color: #198754;
        --danger-color: #dc3545;
        --shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    
    [data-theme='dark'] {
        --background-primary: #121212;
        --background-secondary: #1e1e1e;
        --text-primary: #e9ecef;
        --text-secondary: #adb5bd;
        --border-color: #343a40;
        --accent-color: #0d6efd;
        --accent-color-light: #2a2a2a;
        --accent-text-color: #ffffff;
    }

    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    body {
        font-family: 'Inter', sans-serif;
        background-color: var(--background-primary);
        color: var(--text-primary);
        line-height: 1.6;
        transition: background-color 0.3s, color 0.3s;
    }

    #root {
        display: flex;
        flex-direction: column;
        height: 100vh;
        max-width: 1400px;
        margin: 0 auto;
        padding: 1rem;
    }

    .material-symbols-outlined {
        font-variation-settings:
        'FILL' 0,
        'wght' 400,
        'GRAD' 0,
        'opsz' 24
    }

    button {
        font-family: 'Inter', sans-serif;
        cursor: pointer;
        border: none;
        border-radius: 6px;
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.2s ease;
    }
    
    button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }

    .btn-primary {
        background-color: var(--accent-color);
        color: var(--accent-text-color);
    }
    .btn-primary:hover:not(:disabled) {
        opacity: 0.9;
    }
    
    .btn-secondary {
        background-color: var(--background-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
    }
    .btn-secondary:hover:not(:disabled) {
        background-color: var(--accent-color-light);
    }

    .icon-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.4rem;
        border-radius: 50%;
    }
    .icon-btn:hover {
        background-color: var(--accent-color-light);
        color: var(--accent-color);
    }

    .app-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border-color);
    }

    .app-title {
        font-size: 1.5rem;
        font-weight: 700;
    }
    
    .header-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .view-switcher {
        display: flex;
        background-color: var(--accent-color-light);
        padding: 4px;
        border-radius: 8px;
    }

    .view-switcher button {
        padding: 0.4rem 0.8rem;
        background: none;
        border: none;
        color: var(--text-secondary);
    }

    .view-switcher button.active {
        background-color: var(--background-secondary);
        color: var(--text-primary);
        border-radius: 6px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .main-content {
        flex-grow: 1;
        overflow-y: auto;
        margin-top: 1rem;
    }
    
    /* Week View */
    .week-view-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
    }
    
    .week-nav {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .current-month {
        font-size: 1.2rem;
        font-weight: 600;
        min-width: 150px;
        text-align: center;
    }
    
    .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 8px;
        height: calc(100% - 60px);
    }
    
    .day-column {
        background-color: var(--background-secondary);
        border-radius: 8px;
        padding: 0.5rem;
        border: 1px solid var(--border-color);
    }

    .day-header {
        text-align: center;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: var(--text-secondary);
    }
    
    .day-header .day-name {
        font-size: 0.8rem;
        text-transform: uppercase;
    }
    
    .day-header .day-number {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--text-primary);
        width: 30px;
        height: 30px;
        line-height: 30px;
        border-radius: 50%;
        margin: 0.2rem auto 0;
    }
    
    .day-header .day-number.today {
        background-color: var(--accent-color);
        color: var(--accent-text-color);
    }

    .tasks-container {
        position: relative;
        height: calc(100% - 60px);
        overflow-y: auto;
    }
    
    .task-item-week {
        background-color: var(--accent-color-light);
        border-left: 3px solid var(--accent-color);
        padding: 0.5rem;
        border-radius: 4px;
        margin-bottom: 0.5rem;
        cursor: pointer;
    }
    .task-item-week.completed {
        border-left-color: var(--success-color);
        background-color: var(--background-primary);
        opacity: 0.7;
    }
     .task-item-week.completed .task-title-week {
        text-decoration: line-through;
    }
    
    .task-title-week {
        font-weight: 600;
        font-size: 0.9rem;
    }
    .task-time-week {
        font-size: 0.8rem;
        color: var(--text-secondary);
    }

    /* List View */
    .list-view {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    
    .task-group h2 {
        margin-bottom: 0.5rem;
        font-size: 1.2rem;
    }
    
    .task-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    
    .task-item-list {
        display: flex;
        align-items: center;
        gap: 1rem;
        background-color: var(--background-secondary);
        padding: 1rem;
        border-radius: 8px;
        box-shadow: var(--shadow);
        transition: box-shadow 0.2s;
    }
    .task-item-list:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .task-item-list.completed {
         opacity: 0.6;
    }
    .task-item-list.completed .task-content h3 {
        text-decoration: line-through;
    }
    
    .task-status-toggle {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid var(--border-color);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--accent-text-color);
        flex-shrink: 0;
    }
    
    .task-status-toggle.completed {
        background-color: var(--success-color);
        border-color: var(--success-color);
    }

    .task-content {
        flex-grow: 1;
        cursor: pointer;
    }

    .task-content h3 {
        font-size: 1rem;
        font-weight: 600;
    }
    
    .task-tags {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.25rem;
    }
    
    .tag {
        font-size: 0.75rem;
        background-color: var(--accent-color-light);
        color: var(--text-primary);
        padding: 0.2rem 0.5rem;
        border-radius: 12px;
    }
    
    .task-actions {
        display: flex;
        align-items: center;
    }
    
    /* Modal */
    .modal-overlay {
        position: fixed;
        inset: 0;
        background-color: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }
    
    .modal-content {
        background-color: var(--background-secondary);
        padding: 2rem;
        border-radius: 12px;
        width: 90%;
        max-width: 600px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }
    
    .modal-header h2 {
        font-size: 1.5rem;
    }
    
    .modal-body .form-group {
        margin-bottom: 1rem;
    }
    
    .modal-body label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
    }

    .modal-body input, .modal-body textarea {
        width: 100%;
        padding: 0.75rem;
        border-radius: 6px;
        border: 1px solid var(--border-color);
        background-color: var(--background-primary);
        color: var(--text-primary);
        font-size: 1rem;
    }
    
    .modal-body textarea {
        min-height: 100px;
        resize: vertical;
    }

    .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border-color);
    }

    .voice-input-container {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .record-btn {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: var(--danger-color);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    
    .record-btn.recording {
         animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
        100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
    }
    
    .processing-indicator {
        font-style: italic;
        color: var(--text-secondary);
        margin-top: 0.5rem;
    }

    .parsed-tasks-list {
        max-height: 40vh;
        overflow-y: auto;
        margin-top: 1rem;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background-color: var(--background-primary);
        border-radius: 8px;
    }

    .parsed-task-item {
        background-color: var(--background-secondary);
        padding: 1rem;
        border-radius: 8px;
        border: 1px solid var(--border-color);
    }

    .parsed-task-item .form-group {
        margin-bottom: 0.5rem;
    }
    .parsed-task-item .form-group:last-child {
        margin-bottom: 0;
    }

    .parsed-task-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    .parsed-task-header h4 {
        margin: 0;
        font-size: 1rem;
    }
    
    .loading-indicator, .error-indicator {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        font-size: 1.2rem;
        color: var(--text-secondary);
    }

    @media (max-width: 768px) {
        #root {
            padding: 0.5rem;
        }
        .app-header {
           flex-direction: column;
           gap: 1rem;
           align-items: stretch;
        }
        .header-controls {
            justify-content: space-between;
        }
        .calendar-grid {
            grid-template-columns: 1fr;
            height: auto;
        }
        .day-column {
            margin-bottom: 1rem;
        }
    }
`;


// --- TYPES ---
// Speech Recognition types
interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onend: ((this: SpeechRecognition) => any) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

interface Task {
    id: string;
    title: string;
    description: string;
    datetime: string | null;
    tags: string[];
    status: 'pending' | 'completed';
    created_at: string; // From database
}

type NewTaskData = Omit<Task, 'id' | 'created_at' | 'status'>;

type View = 'week' | 'list';

// --- CONSTANTS ---
const API_KEY = import.meta.env.GEMINI_API_KEY; // Access environment variable
const PREDEFINED_TAGS = ["Học tập", "Sức khỏe", "Công việc", "Mối quan hệ", "Cá nhân", "Mua sắm"];
const API_BASE_URL = import.meta.env.API_BASE_URL || 'http://localhost:3001/api'; // Get from env or fallback

// Debug env variable loading
console.log('API Key status:', API_KEY ? 'Present' : 'Missing');

// --- API HELPERS ---
const api = {
    getTasks: async (): Promise<Task[]> => {
        const response = await fetch(`${API_BASE_URL}/tasks`);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        return response.json();
    },
    addTask: async (taskData: Omit<Task, 'id' | 'created_at'>): Promise<Task> => {
        const response = await fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData),
        });
        if (!response.ok) throw new Error('Failed to add task');
        return response.json();
    },
    updateTask: async (id: string, taskData: Partial<Task>): Promise<Task> => {
        const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData),
        });
        if (!response.ok) throw new Error('Failed to update task');
        return response.json();
    },
    deleteTask: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete task');
    },
};


// --- AI HELPER ---
const ai = new GoogleGenAI({ apiKey: API_KEY });

const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

const analyzeTaskContent = async (
    input: { text?: string; audio?: { blob: Blob; mimeType: string } },
    currentDate: Date
): Promise<NewTaskData[]> => {
    try {
        let contents: any;
        const taskSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                datetime: { type: Type.STRING, nullable: true },
                tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
            },
        };

        const schema = {
            type: Type.ARRAY,
            items: taskSchema
        };

        const todayString = format(currentDate, 'yyyy-MM-dd');

        const commonPrompt = `Phân tích văn bản sau để tạo ra MỘT DANH SÁCH các công việc. Trích xuất thông tin dưới dạng một mảng JSON.
Hôm nay là ngày ${todayString}.
Yêu cầu cho MỖI công việc trong văn bản:
1. "title": Tạo một tiêu đề ngắn gọn (dưới 10 từ).
2. "description": Sử dụng toàn bộ câu hoặc mệnh đề gốc liên quan đến công việc làm mô tả.
3. "datetime": Nếu có thời gian cụ thể (ví dụ: "ngày mai", "tối nay lúc 7 giờ", "thứ hai tuần sau"), trích xuất nó dưới dạng ISO 8601 (YYYY-MM-DDTHH:mm:ss). Nếu không có, trả về null.
4. "tags": Chọn tối đa 3 thẻ phù hợp nhất từ danh sách sau: ${PREDEFINED_TAGS.join(', ')}. Nếu không có thẻ nào phù hợp, trả về một mảng trống.
Nếu văn bản chỉ chứa một công việc, hãy trả về một mảng có một đối tượng. Nếu không tìm thấy công việc nào, trả về một mảng trống.`;

        if (input.audio) {
            const audioData = await blobToBase64(input.audio.blob);
            contents = {
                parts: [
                    { text: `Hãy phiên âm đoạn âm thanh sau và sau đó phân tích văn bản đã phiên âm. ${commonPrompt}` },
                    { inlineData: { mimeType: input.audio.mimeType, data: audioData } }
                ]
            };
        } else if (input.text) {
             contents = `Văn bản: "${input.text}"\n${commonPrompt}`
        } else {
            throw new Error("Input must be text or audio.");
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const jsonString = response.text;
        const parsed = JSON.parse(jsonString);
        return Array.isArray(parsed) ? parsed : [];

    } catch (error) {
        console.error("Error analyzing content:", error);
        return [];
    }
};


// --- HOOKS ---
const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue];
};

const useTheme = (): [string, () => void] => {
    const [theme, setTheme] = useLocalStorage<string>('theme', 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);
    
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return [theme, toggleTheme];
};


// --- COMPONENTS ---
const TaskModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (taskData: NewTaskData, id: string) => void;
    onSaveMultiple: (tasks: NewTaskData[]) => void;
    taskToEdit?: Task | null;
}> = ({ isOpen, onClose, onUpdate, onSaveMultiple, taskToEdit }) => {
    // State for editing a single task
    const [task, setTask] = useState<NewTaskData>({ title: '', description: '', datetime: null, tags: [] });
    // State for multi-add mode
    const [description, setDescription] = useState('');
    const [parsedTasks, setParsedTasks] = useState<NewTaskData[]>([]);

    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Set up speech recognition
    useEffect(() => {
        // Add type definition for SpeechRecognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Speech recognition not supported');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                setDescription(prev => prev + (prev ? '\n' : '') + finalTranscript);
                setTranscript('');
            } else {
                setTranscript(event.results[event.resultIndex][0].transcript);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                alert("Vui lòng cấp quyền truy cập micro để sử dụng tính năng ghi âm.");
            }
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = recognition;
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (taskToEdit) {
                setTask({
                    title: taskToEdit.title,
                    description: taskToEdit.description,
                    datetime: taskToEdit.datetime,
                    tags: taskToEdit.tags,
                });
            } else {
                // Reset states for multi-add mode
                setDescription('');
                setParsedTasks([]);
                setTask({ title: '', description: '', datetime: null, tags: [] });
            }
        }
    }, [taskToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setTask(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        if (taskToEdit) {
            if (!task.title) {
                alert('Tiêu đề không được để trống.');
                return;
            }
            onUpdate(task, taskToEdit.id);
        } else {
            if (parsedTasks.length > 0) {
                onSaveMultiple(parsedTasks);
            }
        }
        onClose();
    };

    const processAndSetAnalyzedTasks = (analyzedData: NewTaskData[]) => {
         const formattedData = analyzedData.map(t => ({
            ...t,
            datetime: t.datetime ? new Date(t.datetime).toISOString() : null,
            tags: t.tags || [],
            description: t.description || t.title
        }));
        setParsedTasks(formattedData);
    };
    
    const handleAnalyzeText = async () => {
        if (!description) return;
        setIsProcessing(true);
        try {
            const analyzedData = await analyzeTaskContent({ text: description }, new Date());
            processAndSetAnalyzedTasks(analyzedData);
        } catch (err) {
            console.error("Error during AI analysis of text:", err);
            alert("Đã xảy ra lỗi khi phân tích văn bản.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleUpdateParsedTask = (index: number, updatedFields: Partial<NewTaskData>) => {
        const newTasks = [...parsedTasks];
        newTasks[index] = { ...newTasks[index], ...updatedFields };
        setParsedTasks(newTasks);
    };

    const handleRemoveParsedTask = (index: number) => {
        setParsedTasks(prev => prev.filter((_, i) => i !== index));
    };

    const handleVoiceInput = async () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            try {
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (!SpeechRecognition) {
                    alert("Trình duyệt của bạn không hỗ trợ chuyển đổi giọng nói. Vui lòng sử dụng Chrome hoặc Edge.");
                    return;
                }

                if (!recognitionRef.current) {
                    alert("Không thể khởi tạo tính năng nhận diện giọng nói. Vui lòng làm mới trang.");
                    return;
                }

                recognitionRef.current.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Error starting speech recognition:", err);
                alert("Không thể bắt đầu nhận diện giọng nói. Vui lòng kiểm tra quyền truy cập micro.");
                setIsRecording(false);
            }
        }
    };


    if (!isOpen) return null;
    
    const renderEditMode = () => (
        <>
            <div className="form-group">
                <label htmlFor="title">Tiêu đề</label>
                <input type="text" id="title" name="title" value={task.title} onChange={handleChange} />
            </div>
            <div className="form-group">
                <label htmlFor="description">Mô tả</label>
                <textarea id="description" name="description" value={task.description} onChange={handleChange} rows={4} />
            </div>
            <div className="form-group">
                <label htmlFor="datetime">Thời gian</label>
                <input
                    type="datetime-local"
                    id="datetime"
                    name="datetime"
                    value={task.datetime ? format(parseISO(task.datetime), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => setTask(prev => ({...prev, datetime: e.target.value ? new Date(e.target.value).toISOString() : null}))}
                />
            </div>
            <div className="form-group">
                 <label>Tags</label>
                 {/* Tag selection logic */}
            </div>
        </>
    );

    const renderAddMode = () => (
        <>
            {parsedTasks.length === 0 ? (
                // Step 1: Input
                <div className="form-group">
                    <label htmlFor="description">Mô tả (nhập nhiều công việc, AI sẽ tự động tách)</label>
                    <div className="voice-input-container">
                        <div className="textarea-container" style={{ position: 'relative', flex: 1 }}>
                            <textarea
                                id="description"
                                name="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="- Mua sữa vào sáng mai&#10;- Gọi cho mẹ lúc 8h tối&#10;- Hoàn thành báo cáo trước thứ Sáu"
                                rows={5}
                            />
                            {isRecording && transcript && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '8px',
                                    left: '8px',
                                    right: '8px',
                                    background: 'var(--accent-color-light)',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.9em',
                                    color: 'var(--text-secondary)'
                                }}>
                                    {transcript}...
                                </div>
                            )}
                        </div>
                        <button
                            className={`record-btn ${isRecording ? 'recording' : ''}`}
                            onClick={handleVoiceInput}
                            disabled={isProcessing}
                            aria-label={isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
                        >
                            <span className="material-symbols-outlined">{isRecording ? 'stop' : 'mic'}</span>
                        </button>
                    </div>
                    {isProcessing && <p className="processing-indicator">AI đang phân tích...</p>}
                    {isRecording && (
                        <p className="processing-indicator" style={{ marginTop: '0.5rem' }}>
                            🎤 Đang nghe... Nói to và rõ ràng
                        </p>
                    )}
                    <button 
                        className="btn-secondary" 
                        style={{marginTop: '0.5rem', width: '100%'}}
                        onClick={handleAnalyzeText}
                        disabled={isProcessing || !description}
                    >
                        Phân tích mô tả bằng AI
                    </button>
                </div>
            ) : (
                // Step 2: Review
                <div>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                         <h4>Vui lòng xem lại các công việc đã được phân tích:</h4>
                         <button className="btn-secondary" onClick={() => setParsedTasks([])}>Bắt đầu lại</button>
                    </div>
                   
                    <div className="parsed-tasks-list">
                        {parsedTasks.map((pTask, index) => (
                            <div key={index} className="parsed-task-item">
                                <div className="parsed-task-header">
                                    <h4>Công việc #{index + 1}</h4>
                                    <button className="icon-btn" onClick={() => handleRemoveParsedTask(index)} aria-label="Xóa công việc">
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                                <div className="form-group">
                                    <label>Tiêu đề</label>
                                    <input value={pTask.title} onChange={(e) => handleUpdateParsedTask(index, { title: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Thời gian</label>
                                     <input
                                        type="datetime-local"
                                        value={pTask.datetime ? format(parseISO(pTask.datetime), "yyyy-MM-dd'T'HH:mm") : ''}
                                        onChange={(e) => handleUpdateParsedTask(index, { datetime: e.target.value ? new Date(e.target.value).toISOString() : null})}
                                    />
                                </div>
                                {/* In-line Tag editor can be added here if needed */}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{taskToEdit ? 'Chỉnh sửa công việc' : 'Thêm công việc mới'}</h2>
                    <button className="icon-btn" onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="modal-body">
                    {taskToEdit ? renderEditMode() : renderAddMode()}
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Hủy</button>
                    <button 
                        className="btn-primary" 
                        onClick={handleSave}
                        disabled={isProcessing || (!taskToEdit && parsedTasks.length === 0)}
                    >
                         {taskToEdit ? 'Lưu thay đổi' : `Lưu ${parsedTasks.length} công việc`}
                    </button>
                </div>
            </div>
        </div>
    );
};

// FIX: Moved TaskItem component outside of ListView to prevent re-declaration on every render
// Confirmation Modal Component
const ConfirmModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div 
                className="modal-content" 
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '400px' }}
            >
                <div className="modal-header">
                    <h2 style={{ fontSize: '1.2rem' }}>{title}</h2>
                    <button className="icon-btn" onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="modal-body">
                    <p>{message}</p>
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Hủy</button>
                    <button 
                        className="btn-primary"
                        style={{ backgroundColor: 'var(--danger-color)' }}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        Xóa
                    </button>
                </div>
            </div>
        </div>
    );
};

const TaskItem: React.FC<{
    task: Task;
    onToggleStatus: (id: string, status: 'pending' | 'completed') => void;
    onDelete: (id: string) => void;
    onEdit: (task: Task) => void;
}> = ({ task, onToggleStatus, onDelete, onEdit }) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isCompleted = task.status === 'completed';

    return (
        <>
            <div className={`task-item-list ${isCompleted ? 'completed' : ''}`}>
                <div
                    className={`task-status-toggle ${isCompleted ? 'completed' : ''}`}
                    onClick={() => onToggleStatus(task.id, isCompleted ? 'pending' : 'completed')}
                    role="checkbox"
                    aria-checked={isCompleted}
                >
                    {isCompleted && <span className="material-symbols-outlined" style={{fontSize: '16px'}}>check</span>}
                </div>
                <div className="task-content" onClick={() => onEdit(task)}>
                    <h3>{task.title}</h3>
                    {task.datetime && <p style={{color: 'var(--text-secondary)', fontSize: '0.8rem'}}>{format(parseISO(task.datetime), 'HH:mm, dd/MM/yyyy')}</p>}
                    <div className="task-tags">
                        {task.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                    </div>
                </div>
                <div className="task-actions">
                    <button className="icon-btn" onClick={() => onEdit(task)}>
                        <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button className="icon-btn" onClick={() => setShowDeleteConfirm(true)}>
                        <span className="material-symbols-outlined">delete</span>
                    </button>
                </div>
            </div>

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => onDelete(task.id)}
                title="Xác nhận xóa công việc"
                message={`Bạn có chắc chắn muốn xóa công việc "${task.title}"? Hành động này không thể hoàn tác.`}
            />
        </>
    );
};


const WeekView: React.FC<{
    tasks: Task[];
    onEdit: (task: Task) => void;
}> = ({ tasks, onEdit }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const weekStart = startOfWeek(currentDate, { locale: vi });
    const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    const today = new Date();

    const handlePrevWeek = () => setCurrentDate(prev => subWeeks(prev, 1));
    const handleNextWeek = () => setCurrentDate(prev => addWeeks(prev, 1));

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <div className="week-view-header">
                 <div className="week-nav">
                    <button className="icon-btn" onClick={handlePrevWeek}><span className="material-symbols-outlined">chevron_left</span></button>
                    <span className="current-month">{format(currentDate, 'MMMM yyyy', {locale: vi})}</span>
                    <button className="icon-btn" onClick={handleNextWeek}><span className="material-symbols-outlined">chevron_right</span></button>
                </div>
                 <button className="btn-secondary" onClick={() => setCurrentDate(new Date())}>Hôm nay</button>
            </div>
            <div className="calendar-grid">
                {weekDays.map(day => {
                    const dailyTasks = tasks.filter(t => t.datetime && isSameDay(parseISO(t.datetime), day));
                    return (
                        <div key={day.toString()} className="day-column">
                            <div className="day-header">
                                <div className="day-name">{format(day, 'E', {locale: vi})}</div>
                                <div className={`day-number ${isSameDay(day, today) ? 'today' : ''}`}>{format(day, 'd')}</div>
                            </div>
                            <div className="tasks-container">
                                {dailyTasks.sort((a,b) => parseISO(a.datetime).getTime() - parseISO(b.datetime).getTime()).map(task => (
                                    <div key={task.id} className={`task-item-week ${task.status}`} onClick={() => onEdit(task)}>
                                        <div className="task-title-week">{task.title}</div>
                                        <div className="task-time-week">{format(parseISO(task.datetime), 'HH:mm')}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ListView: React.FC<{
    tasks: Task[];
    onToggleStatus: (id: string, status: 'pending' | 'completed') => void;
    onDelete: (id: string) => void;
    onEdit: (task: Task) => void;
}> = ({ tasks, onToggleStatus, onDelete, onEdit }) => {
    const scheduledTasks = tasks.filter(t => t.datetime);
    const longTermTasks = tasks.filter(t => !t.datetime);

    return (
        <div className="list-view">
            <div className="task-group">
                <h2>🕓 Công việc ngắn hạn</h2>
                <div className="task-list">
                    {scheduledTasks.map(task => 
                        <TaskItem key={task.id} task={task} onToggleStatus={onToggleStatus} onDelete={onDelete} onEdit={onEdit} />
                    )}
                </div>
            </div>
            <div className="task-group">
                <h2>📋 Ghi chú dài hạn</h2>
                <div className="task-list">
                    {longTermTasks.map(task => 
                         <TaskItem key={task.id} task={task} onToggleStatus={onToggleStatus} onDelete={onDelete} onEdit={onEdit} />
                    )}
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [view, setView] = useState<View>('week');
    const [theme, toggleTheme] = useTheme();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const fetchedTasks = await api.getTasks();
                setTasks(fetchedTasks);
            } catch (err) {
                setError('Không thể kết nối đến máy chủ. Vui lòng đảm bảo máy chủ backend đang chạy và thử lại.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTasks();
    }, []);

    const handleOpenModal = (task?: Task) => {
        setTaskToEdit(task || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setTaskToEdit(null);
        setIsModalOpen(false);
    };

    const handleUpdateTask = async (taskData: NewTaskData, id: string) => {
        try {
            const updatedTask = await api.updateTask(id, taskData);
            setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
        } catch (err) {
             console.error(err);
             alert('Lỗi khi cập nhật công việc. Vui lòng thử lại.');
        }
    };
    
    const handleSaveMultipleTasks = async (tasksData: NewTaskData[]) => {
         try {
            const newTasksPayloads = tasksData.map(taskData => ({ ...taskData, status: 'pending' as const }));
            const promises = newTasksPayloads.map(payload => api.addTask(payload));
            const newTasks = await Promise.all(promises);
            setTasks(prev => [...prev, ...newTasks]);
        } catch (err) {
            console.error(err);
            alert('Lỗi khi lưu một hoặc nhiều công việc. Vui lòng thử lại.');
        }
    };
    
    const handleDeleteTask = async (id: string) => {
        try {
            await api.deleteTask(id);
            setTasks(prev => prev.filter(t => t.id !== id));
        } catch(err) {
            console.error(err);
            alert('Lỗi khi xóa công việc. Vui lòng thử lại.');
        }
    };

    const handleToggleStatus = async (id: string, status: 'pending' | 'completed') => {
        try {
            const updatedTask = await api.updateTask(id, { status });
            setTasks(prev => prev.map(t => t.id === id ? updatedTask : t));
        } catch(err) {
            console.error(err);
            alert('Lỗi khi cập nhật trạng thái. Vui lòng thử lại.');
        }
    };

    const MainView = () => {
        if (isLoading) {
            return <div className="loading-indicator">Đang tải dữ liệu...</div>;
        }
        if (error) {
            return <div className="error-indicator">{error}</div>;
        }
        if (view === 'week') {
            return <WeekView tasks={tasks} onEdit={handleOpenModal} />;
        }
        return <ListView tasks={tasks} onToggleStatus={handleToggleStatus} onDelete={handleDeleteTask} onEdit={handleOpenModal} />;
    };

    return (
        <>
            <header className="app-header">
                <h1 className="app-title">AI Task Manager</h1>
                <div className="header-controls">
                     <div className="view-switcher">
                        <button onClick={() => setView('week')} className={view === 'week' ? 'active' : ''}>Tuần</button>
                        <button onClick={() => setView('list')} className={view === 'list' ? 'active' : ''}>Danh sách</button>
                    </div>
                     <button className="icon-btn" onClick={toggleTheme}>
                        <span className="material-symbols-outlined">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
                    </button>
                    <button className="btn-primary" onClick={() => handleOpenModal()}>
                       <span className="material-symbols-outlined" style={{fontSize: '16px', marginRight: '4px'}}>add</span>
                        Thêm công việc
                    </button>
                </div>
            </header>

            <main className="main-content">
                <MainView />
            </main>

            <TaskModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onUpdate={handleUpdateTask}
                onSaveMultiple={handleSaveMultipleTasks}
                taskToEdit={taskToEdit}
            />
        </>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
