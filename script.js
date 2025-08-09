(function () {
    const chatStates = {};

    function getSenderName(node, chatBox, isForum) {
        if (isForum) {
            return node.querySelector(".lzc_g_name")?.innerText.trim() || "Ai đó";
        } else {
            const accountNameElement = chatBox.querySelector('.lzc_b_name');
            return accountNameElement ? accountNameElement.innerText.trim() : "Bạn chủ";
        }
    }

    function sendMessage(chatBox, id, message, isForum = false) {
        const maxMessageLength = 500;
        const input = chatBox.querySelector("[id^='lzc_text_']");
        const sendButton = chatBox.querySelector(".lzc_text_send");

        if (!input || !sendButton) {
            console.warn(`❌ Không tìm thấy ô nhập hoặc nút gửi trong chat #${id}`);
            return;
        }

        const send = (msg) => {
            input.dispatchEvent(new Event("focus", { bubbles: true }));
            input.innerHTML = msg;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            sendButton.click();
        };

        if (isForum && message.length > maxMessageLength) {
            const parts = [];
            while (message.length > maxMessageLength) {
                let splitIndex = message.lastIndexOf(" ", maxMessageLength);
                if (splitIndex === -1) splitIndex = maxMessageLength;
                parts.push(message.slice(0, splitIndex));
                message = message.slice(splitIndex).trim();
            }
            parts.push(message);

            parts.forEach((part, i) => {
                setTimeout(() => {
                    send(part);
                    console.log(`✅ Đã gửi phần ${i + 1}: ${part}`);
                }, i * 1000);
            });
        } else {
            send(message);
            console.log("✅ Đã gửi:", message);
        }
    }

    async function getWikipediaSummaryByUrl(keyword) {
        const searchUrl = `https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(keyword)}`;
        try {
            const summaryResponse = await fetch(searchUrl);
            const summaryData = await summaryResponse.json();
            return summaryData.extract || null;
        } catch (e) {
            console.warn("❌ Wikipedia page fetch error:", e);
            return null;
        }
    }

    async function getWikipediaSummaryByOpenSearch(keyword) {
        const searchUrl = `https://vi.wikipedia.org/w/api.php?action=opensearch&format=json&search=${encodeURIComponent(keyword)}&limit=1&namespace=0&origin=*`;
        try {
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();
            const titles = searchData[1];
            if (titles.length === 0) return null;

            const exactTitle = titles[0];
            const summaryUrl = `https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(exactTitle)}`;
            const summaryResponse = await fetch(summaryUrl);
            const summaryData = await summaryResponse.json();
            return summaryData.extract || null;
        } catch (e) {
            console.warn("❌ Wikipedia opensearch error:", e);
            return null;
        }
    }

    async function getOpenScratchProject(keyword) {
        const apiUrl = `https://openscratchapi.dev/search?q=${encodeURIComponent(keyword)}`;
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            if (data.length === 0) return null;
            const top = data[0];
            return `Dự án "${top.title}" bởi ${top.author.username}: https://scratch.mit.edu/projects/${top.id}`;
        } catch (e) {
            console.warn("❌ OpenScratch fetch error:", e);
            return null;
        }
    }

    function observeChat(chatBox) {
        const boxId = chatBox?.id?.replace("lzc_boxchat_", "") || "forum";
        if (!boxId) return;

        if (chatStates[boxId]?.element !== chatBox) {
            console.log(`🔄 Theo dõi lại khung chat #${boxId}`);
        } else if (chatStates[boxId]) return;

        console.log(`👀 Đang theo dõi khung chat #${boxId}`);
        chatStates[boxId] = {
            lastMessage: "",
            isResponding: false,
            element: chatBox
        };

        const chatBody = chatBox.querySelector(".lzc_body");
        if (!chatBody) return;

        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) {
                        const rawText = node.innerText.trim();
                        const isForum = boxId.startsWith("forum");

                        if (
                            rawText &&
                            rawText !== chatStates[boxId].lastMessage &&
                            !chatStates[boxId].isResponding
                        ) {
                            chatStates[boxId].isResponding = true;

                            // Lệnh /help (chỉ trong nhóm)
                            if (isForum && rawText.trim() === "/help") {
                                const helpMsg = `📚 Lệnh bot hỗ trợ:
- /e <từ khóa>: tra Wikipedia
- /s <hành động> <ai đó>: ghi hành động vui vui
- Chat riêng: chỉ cần gửi từ khóa (không cần /e)`;
                                sendMessage(chatBox, boxId, helpMsg, true);
                                chatStates[boxId].lastMessage = rawText;
                                setTimeout(() => chatStates[boxId].isResponding = false, 3000);
                                return;
                            }

                            // Trường hợp lệnh /s (chỉ trong nhóm)
                            if (isForum && rawText.startsWith("/s ")) {
                                const senderName = getSenderName(node, chatBox, isForum);
                                const [action, ...targetArr] = rawText.slice(3).trim().split(" ");
                                const target = targetArr.join(" ");
                                const response = `${senderName} đã ${action} ${target}`;
                                sendMessage(chatBox, boxId, response, true);
                                chatStates[boxId].lastMessage = rawText;
                                setTimeout(() => chatStates[boxId].isResponding = false, 3000);
                                return;
                            }

                            // Trường hợp Wikipedia (trong nhóm cần /e, riêng thì không cần)
                            const query = isForum
                                ? (rawText.startsWith("/e ") ? rawText.slice(3).trim() : null)
                                : rawText;

                            if (query) {
                                const senderName = getSenderName(node, chatBox, isForum);

                                getWikipediaSummaryByUrl(query).then(async summary => {
                                    let reply;
                                    if (summary) {
                                        reply = `${senderName}, Wikipedia nói: "${summary}"`;
                                    } else {
                                        const searchSummary = await getWikipediaSummaryByOpenSearch(query);
                                        if (searchSummary) {
                                            reply = `${senderName}, Wikipedia nói: "${searchSummary}"`;
                                        } else {
                                            const scratch = await getOpenScratchProject(query);
                                            reply = scratch
                                                ? `${senderName}, Không có trên Wikipedia nhưng mình tìm được trên Scratch: ${scratch}`
                                                : `${senderName}, Không tìm thấy thông tin phù hợp. Hãy thử ghi từ khóa rõ ràng hơn.`;
                                        }
                                    }

                                    sendMessage(chatBox, boxId, reply, isForum);
                                    chatStates[boxId].lastMessage = rawText;
                                    setTimeout(() => chatStates[boxId].isResponding = false, 3000);
                                });
                            } else {
                                chatStates[boxId].isResponding = false;
                            }
                        }
                    }
                }
            }
        });

        observer.observe(chatBody, { childList: true, subtree: true });
    }

    const bodyObserver = new MutationObserver(() => {
        const chatBoxes = document.querySelectorAll(".lzc_box_item_pc");
        chatBoxes.forEach(observeChat);
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });

    console.log("🤖 Bot đã bật! /e để tra Wikipedia, /s để làm hành động (trong nhóm). Chat riêng không cần lệnh. Gõ /help để xem hướng dẫn.");
})();