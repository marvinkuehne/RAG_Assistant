import {useState, useEffect, useRef} from "react";
import api from '../api.ts';
import './AskPage.css';


//Interface determines what a chatmessage contains
type ChatMessage = { role: "user" | "assistant"; content: string; sources?: string[]; };


export default function AskPage() {

    const [input, setInput] = useState("");
    const [source, setSource] = useState<string[]>([]); //initialize string array that is empty
    const [isLoading, setIsLoading] = useState(false); // showing true/false of handleclick
    const [progress, setProgress] = useState(0); //showing % of progess bar
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const messageEndRef = useRef(null)

    function handleChange(e) {
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
    const handleEnterKey = (e) => {
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

        const response = await api.post("/ask", {query: input}); // 4) Ask backend (await = as program should wait for further execution until after backend answered)
        // console.log({
        //     Answer: response.data[0],
        //     Sources: response.data[1]
        // });

        const assistantMsg: ChatMessage = {role: "assistant", content: response.data[0], sources: response.data[1]}; // 5) Append assistant reply to messages
        setMessages((prev) => [...prev, assistantMsg]);

        setIsLoading(false); // end loading bar
    }

    return (
        <div>

            {/* Chat-History */}
            <div className="chat d-flex flex-column gap-3 mb-3">
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={m.role === "user" ? "msg user" : "msg assistant"}
                    >
                        <div>{m.content}</div>

                        {/* Show sources only when assistant  */}
                        {m.role === "assistant" && m.sources && m.sources.length > 0 && (

                            <div>
                                <ul> {m.sources.map(src => <li>{src}</li>)}</ul>
                            </div>
                        )}
                    </div>
                ))}

                {/* Anker point auto-scroll to newest chat entry */}
                <div ref={messageEndRef}>

                </div>
            </div>

            <input id="InputId" value={input} onKeyDown={handleEnterKey}
                   onChange={handleChange}/> {/* value={input} = empty input field in UI */}
            <button type="button" className="btn btn-dark" onClick={handleClick}>Send</button>

            <div>
                {isLoading && (
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                )}
            </div>


        </div>
    );
}