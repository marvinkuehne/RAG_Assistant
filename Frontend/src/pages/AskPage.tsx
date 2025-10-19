import {useState, useEffect, useRef} from "react";
import api from '../api.ts';
import './AskPage.css';
import Select from "react-select";
// import AnswerDisplay from "../components/AnswerDisplay.tsx";
import {useUserId} from "../components/useUserID.ts";


//Interface determines what a chatmessage contains
type ChatMessage = {
    role: "user" | "assistant";
    content: string;
    sources?: string[];
};

type CatOption = { value: string; label: string };


export default function AskPage() {

    const [input, setInput] = useState("");
    // const [source, setSource] = useState<string[]>([]); //initialize string array that is empty
    const [isLoading, setIsLoading] = useState(false); // showing true/false of handleclick
    const [progress, setProgress] = useState(0); //showing % of progess bar
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [categories, setCategories] = useState<{ value: string; label: string }[]>([]); //for dropdown
    const [selectedCategories, setSelectedCategories] = useState<{ value: string; label: string }[]>([]); //for query
    const [sessions, setSessions] = useState<{ session_id: string; title: string }[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const messageEndRef = useRef<HTMLDivElement | null>(null);


    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value; // when event (e) object is passed (= writing in input field) content  is stored in value
        setInput(value); //sets input = value
    }

    // Load all sessions when userId becomes available
    const userId = useUserId() //fetch/create user id
    useEffect(() => {
        if (!userId) return;

        async function fetchSessions() {
            try {
                const res = await api.get(`/get_sessions/${userId}`);
                const allSessions = res.data || [];
                setSessions(allSessions);

                // Falls User noch keine Sessions hat → neue erstellen
                if (allSessions.length === 0) {
                    const newSession = await api.post("/create_session", {
                        user_id: userId,
                        title: "New Chat",
                    });
                    setCurrentSessionId(newSession.data.session_id);
                } else {
                    // Nimm die neueste Session als aktive
                    setCurrentSessionId(allSessions[0].session_id);
                }
            } catch (err) {
                console.error("Error loading sessions:", err);
            }
        }

        fetchSessions();
    }, [userId]);

    useEffect(() => {
        if (!currentSessionId) return;

        async function fetchMessages() {
            try {
                const res = await api.get(`/get_session/${currentSessionId}`);
                setMessages(res.data ?? []);
            } catch (err) {
                console.error("Error loading messages for session:", err);
            }
        }

        fetchMessages();
    }, [currentSessionId]);

    //synchronize chat messages when messages state changes
    useEffect(() => {
        if (userId && currentSessionId) {
            //1. Save locally
            localStorage.setItem(`chat_${userId}_${currentSessionId}`, JSON.stringify(messages));

            //2. Save on backend
            async function saveChat() {
                try {
                    await api.post("/save_session", {
                        session_id: currentSessionId,
                        messages: messages,
                    });
                } catch (error) {
                    console.error("Error saving chat:", error);
                }
            }

            saveChat();
        }
    }, [messages, userId, currentSessionId]);


    //Progress Bar
    useEffect(() => {
        if (isLoading == true) {
            const id = setInterval(() => {
                setProgress((prev) => {
                    const next = prev + 10;
                    if (next >= 90) {
                        clearInterval(id);
                        return 90;
                    }
                    return next;
                });
            }, 400);
        } else {
            setProgress(100);
            setTimeout(() => {
                setProgress(0);
            }, 1000);
        }
    }, [isLoading]);

    // Change in the messages array triggers useEffect --> scrolls down
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({behavior: "smooth"});

    }, [messages]);

    // Dynamically update browser tab title based on current chat
    useEffect(() => {
        document.title = currentSessionId
            ? sessions.find((s) => s.session_id === currentSessionId)?.title || "Chat"
            : "New Chat";
    }, [currentSessionId, sessions]);


    //Send via Enter key
    const handleEnterKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key == "Enter") {
            handleClick();

        }
    }

    async function handleClick() {
        //use state "input"
        // pack json object in form that the BaseModel in router expects (uses axios)

        if (!input.trim()) return;          // trim() = remove spaces between words / return = end function her and send nothing

        const userMsg: ChatMessage = {role: "user", content: input}; // 1) build temporary user message object of type ChatMessage
        setMessages((prev) => [...prev, userMsg]); // 2) Add it to messages (function, to avoid batching (e.g. overwrite several newMessages with the latest))
        setInput(""); //3) clear input
        setIsLoading(true); // start loading bar

        //Ask backend
        const response = await api.post("/ask", {
            query: input,
            categories: selectedCategories.map(c => c.label),
            user_id: userId,
        }); // 4) Ask backend (await = as program should wait for further execution until after backend answered)

        console.log(response.data);

        const assistantMsg: ChatMessage = { // 5) Append assistant reply to messages
            role: "assistant",
            content: response.data[0],
            sources: response.data[1]};
        setMessages((prev) => [...prev, assistantMsg]);

        setIsLoading(false); // end loading bar
    }

    //Auto Resize Input field
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    function autoResize() {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "0px";
        el.style.height = Math.min(el.scrollHeight, 160) + "px"; // max 160px
    }

    // beim Tippen/Setzen der Eingabe Höhe anpassen
    useEffect(() => {
        autoResize();
    }, [input]);


    const getSelectStyles = (isEmpty: boolean) => ({
        // Wichtig: Container auf Inhalt dimensionieren
        container: (base: any) => ({
            ...base,
            display: "inline-block",    // verhindert 100%-Stretch im Flex-Container
            width: "fit-content",       // passt sich dem Inhalt an
            minWidth: isEmpty ? 140 : undefined, // klein starten, z.B. 140px, sonst frei
            maxWidth: 640,              // optionaler Deckel (z.B. 640px)
            flexGrow: 0,                // in Flex-Layouts nicht aufziehen
        }),
        control: (base: any) => ({
            ...base,
            width: "auto",              // nicht auf 100% ziehen
            minHeight: 40,
            backgroundColor: "#1f2937", // deine Dark-Styles
            borderColor: "#374151",
            color: "white",
        }),
        menu: (base: any) => ({
            ...base,
            backgroundColor: "#111827",
            color: "white",
            zIndex: 50,
        }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isFocused ? "#374151" : "#111827",
            color: "white",
            cursor: "pointer",
        }),
        multiValue: (base: any) => ({
            ...base,
            backgroundColor: "#374151",
        }),
        multiValueLabel: (base: any) => ({
            ...base,
            color: "white",
        }),
        multiValueRemove: (base: any) => ({
            ...base,
            color: "white",
            ":hover": {backgroundColor: "#4b5563", color: "white"},
        }),
        // wichtige Kleinigkeiten: kein Extra-Offset, damit die Breite nicht "aufbläht"
        valueContainer: (base: any) => ({
            ...base,
            gap: 6,
            paddingRight: 8,
        }),
        input: (base: any) => ({...base, color: "white", margin: 0, padding: 0}),
        placeholder: (base: any) => ({...base, color: "#9CA3AF", margin: 0}),
    });


    return (
        <div className="flex flex-col h-full bg-neutral-900 text-white">
            {/* Session Controls */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <select
                        value={currentSessionId ?? ""}
                        onChange={(e) => setCurrentSessionId(e.target.value)}
                        className="bg-neutral-800 text-white border border-neutral-700 rounded-lg px-3 py-2"
                    >
                        {sessions.map((s) => (
                            <option key={s.session_id} value={s.session_id}>
                                {s.title || "Untitled Chat"}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={async () => {
                            const res = await api.post("/create_session", {
                                user_id: userId,
                                title: `New Chat ${sessions.length + 1}`,
                            });
                            setSessions((prev) => [res.data, ...prev]);
                            setCurrentSessionId(res.data.session_id);
                            setMessages([]); // clear chat
                        }}
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-500"
                    >
                        + New
                    </button>
                </div>

                {/* 🗑 Delete Button */}
                <button
                    onClick={async () => {
                        if (!currentSessionId) return;

                        const confirmDelete = window.confirm("Delete this chat session?");
                        if (!confirmDelete) return;

                        try {
                            await api.delete(`/delete_session/${currentSessionId}`);

                            // Entferne gelöschte Session aus dem State
                            setSessions((prev) => prev.filter((s) => s.session_id !== currentSessionId));

                            // Wähle eine andere Session oder lösche alles
                            if (sessions.length > 1) {
                                const next = sessions.find((s) => s.session_id !== currentSessionId);
                                setCurrentSessionId(next ? next.session_id : null);
                            } else {
                                setCurrentSessionId(null);
                                setMessages([]);
                            }
                        } catch (err) {
                            console.error("Error deleting session:", err);
                        }
                    }}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-500"
                >
                    🗑 Delete
                </button>
            </div>

            {/* Chat-History */
            }
            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4">
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={[
                                "max-w-[92%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm",
                                m.role === "user"
                                    ? "bg-blue-600 text-white rounded-br-md"
                                    : "bg-neutral-800 text-neutral-100 border border-neutral-700",
                            ].join(" ")}
                        >


                                <div className="whitespace-pre-wrap">{m.content}</div>


                            {/* Show sources only when assistant  */}
                            {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                                <div className="mt-3 border-t border-neutral-700 pt-2">
                                    <div className="text-xs uppercase tracking-wide text-neutral-400 mb-1">
                                        Sources
                                    </div>
                                    <ul className="list-disc pl-5 text-sm text-neutral-300">
                                        {m.sources.map((src, idx) => (
                                            <li key={idx}>{src}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Anker point auto-scroll to newest chat entry */}
                <div ref={messageEndRef}></div>
            </div>

            {/* Composer */
            }
            <div className="border-t border-neutral-800 px-3 sm:px-6 py-3 bg-black/20">
                <div className="flex items-end gap-2">
        <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
                // Enter = senden, Shift+Enter = Zeilenumbruch
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleClick();
                }
            }}
            placeholder="Ask something…"
            className="min-h-[44px] max-h-40 w-full resize-none rounded-2xl
                     bg-neutral-800 text-white placeholder:text-neutral-500
                     px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
        />

                    <button
                        type="button"
                        onClick={handleClick}
                        disabled={isLoading || !input.trim()}
                        className="shrink-0 rounded-2xl bg-blue-600 px-4 py-2 font-medium text-white
                     hover:bg-blue-500 disabled:opacity-50"
                    >
                        Send
                    </button>

                    {/* dezenter Spinner während Loading */}
                    {isLoading && (
                        <div
                            className="h-5 w-5 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"
                            aria-label="Loading"
                        />
                    )}
                </div>

                {/* Kategorien-Auswahl */}
                <div className="mt-4">
                    <Select
                        className="inline-block" // sichert, dass der Container nicht auf volle Breite geht
                        isMulti
                        options={categories}
                        value={selectedCategories}
                        onChange={(opts) => setSelectedCategories((opts ?? []) as CatOption[])}
                        onMenuOpen={async () => {
                            const res = await api.get(`/get_category/${userId}`);
                            setCategories(res.data.categories.map((c: string) => ({value: c, label: c})));
                        }}
                        menuPlacement="top"
                        menuPosition="fixed"
                        menuPortalTarget={document.body}
                        styles={getSelectStyles(selectedCategories.length === 0)}
                    />
                </div>
            </div>
        </div>
    )
        ;
}
