import {useState, useEffect, useRef} from "react";
import api from '../api.ts';
import './AskPage.css';
import Select, {type StylesConfig} from "react-select";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


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
    const messageEndRef = useRef<HTMLDivElement | null>(null);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value; // when event (e) object is passed (= writing in input field) content  is stored in value
        setInput(value); //sets input = value
    }

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
        const response = await api.post("http://localhost:8000/ask", {
            query: input,
            categories: selectedCategories.map(c => c.label)
        }); // 4) Ask backend (await = as program should wait for further execution until after backend answered)
        console.log(response.data);

        const assistantMsg: ChatMessage = {role: "assistant", content: response.data[0], sources: response.data[1]}; // 5) Append assistant reply to messages
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


    const selectStyles: StylesConfig<CatOption, true> = {
        control: (base) => ({
            ...base,
            backgroundColor: "#1f2937",
            borderColor: "#374151",
            color: "white",
            minHeight: "40px",
        }),
        menu: (base) => ({
            ...base,
            backgroundColor: "#111827",
            color: "white",
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? "#374151" : "#111827",
            color: "white",
            cursor: "pointer",
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: "#374151",
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: "white",
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: "white",
            ":hover": {backgroundColor: "#4b5563", color: "white"},
        }),
        singleValue: (base) => ({...base, color: "white"}),
        input: (base) => ({...base, color: "white"}),
        placeholder: (base) => ({...base, color: "#9CA3AF"}),
    };

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
        <div className="flex h-full flex-col">

            {/* Chat-History */}
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
                            {m.role === "assistant" ? (
                                // Assistant: gerendert als Markdown (Überschriften, Listen, Code, Zitate, Links…)
                                <div
                                    className="prose prose-invert prose-lg max-w-none leading-relaxed
                           prose-headings:font-semibold prose-h2:mt-0
                           prose-p:my-3 prose-ul:my-3 prose-ol:my-3
                           prose-li:my-1 prose-strong:text-neutral-100
                           prose-code:text-neutral-200"
                                >
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            pre: ({children}) => (
                                                <pre
                                                    className="my-4 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900 p-3">
                        {children}
                      </pre>
                                            ),
                                            code: ({children}) => (
                                                <code className="rounded bg-neutral-900 px-1 py-0.5">
                                                    {children}
                                                </code>
                                            ),
                                            blockquote: ({children}) => (
                                                <blockquote
                                                    className="my-4 border-l-4 border-blue-500/60 bg-neutral-900/60 px-4 py-3 rounded-r-xl text-neutral-200">
                                                    {children}
                                                </blockquote>
                                            ),
                                            hr: () => <hr className="my-6 border-neutral-800"/>,
                                            a: (props) => (
                                                <a
                                                    {...props}
                                                    className="text-blue-400 underline hover:text-blue-300"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                />
                                            ),
                                        }}
                                    >
                                        {m.content}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                // User-Bubble (nur Text)
                                <div className="whitespace-pre-wrap">{m.content}</div>
                            )}

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

            {/* Composer */}
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
                            const res = await api.get("http://localhost:8000/get_category");
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
