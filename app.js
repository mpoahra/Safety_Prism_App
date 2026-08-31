// Optimized Safety Analysis Application
// Performance optimizations: minified, debounced API calls, lazy loading, error handling

(function() {
    'use strict';
    
    // Global state
    let analysisResults = {};
    let synthesisChecklist = [];
    let accidentDescription = '';
    let apiCallTimeout = null;
    
    // DOM elements cache
    const elements = {
        lessonLearnedPackage: document.getElementById('lesson-learned-package'),
        mainDescriptionInput: document.getElementById('main-accident-description'),
        startAnalysisBtn: document.getElementById('start-analysis-btn'),
        analysisDashboard: document.getElementById('analysis-dashboard'),
        synthesisTriggerContainer: document.getElementById('synthesis-trigger-container'),
        generateSynthesisBtn: document.getElementById('generate-synthesis-btn'),
        synthesisChecklistContainer: document.getElementById('synthesis-checklist-container'),
        finalizeCausesBtn: document.getElementById('finalize-causes-btn'),
        generatePackageBtn: document.getElementById('generate-package-btn'),
        downloadPptxBtn: document.getElementById('download-pptx-btn'),
        printBtn: document.getElementById('print-btn'),
        llContentWrapper: document.getElementById('ll-content-wrapper'),
        errorModal: document.getElementById('error-modal'),
        errorMessage: document.getElementById('error-message'),
        bowtieModal: document.getElementById('bowtie-modal'),
        bowtieModalTitle: document.getElementById('bowtie-modal-title'),
        bowtieModalDescription: document.getElementById('bowtie-modal-description'),
        guideModal: document.getElementById('writing-guide-modal'),
        openGuideBtn: document.getElementById('open-guide-btn'),
        closeGuideBtns: [
            document.getElementById('close-guide-btn'),
            document.getElementById('close-guide-btn-footer')
        ],
        insertTemplateBtn: document.getElementById('insert-template-btn'),
        speechToTextBtn: document.getElementById('speech-to-text-btn')
    };

    // Methodologies definition
    const methodologies = [
        { id: 'narrative', title: '۱. روایت‌سازی حادثه', description: 'تبدیل گزارش خشک و فنی حادثه به یک داستان تأثیرگذار و قابل درک برای انتقال بهتر درس‌آموخته‌ها.', generator: generateNarrative, renderer: renderNarrative },
        { id: 'bowtie', title: '۲. تحلیل پاپیونی (Bow-Tie)', description: 'یک روش گرافیکی برای نمایش ریسک که ارتباط بین تهدیدها، موانع و پیامدها را نشان می‌دهد.', generator: generateBowTie, renderer: renderBowTie, isVisual: true },
        { id: '5whys', title: '۳. تحلیل ۵ چرا (5 Whys)', description: 'یک تکنیک ساده و مؤثر برای ریشه‌یابی سریع علت اصلی یک مشکل با پرسیدن مکرر سؤال «چرا؟».', generator: generate5Whys, renderer: renderMarkdown },
        { id: 'hfacs', title: '۴. تحلیل علل ریشه‌ای (HFACS)', description: 'چارچوبی برای تحلیل و طبقه‌بندی خطاهای انسانی در حوادث، با تمرکز بر چهار سطح مختلف.', generator: generateHfacs, renderer: renderMarkdown },
        { id: 'stamp', title: '۵. تحلیل سیستمی (STAMP)', description: 'یک مدل پیشرفته که حوادث را نتیجه نقص در ساختار کنترل ایمنی سیستم بررسی می‌کند.', generator: generateSTAMP, renderer: renderMarkdown },
        { id: 'fram', title: '۶. تحلیل تاب‌آوری (FRAM)', description: 'روشی برای درک اینکه کارها چگونه معمولاً با موفقیت انجام می‌شوند و چگونه تغییرات روزمره منجر به شکست می‌شود.', generator: generateFRAM, renderer: renderMarkdown },
        { id: 'swisscheese', title: '۷. مدل پنیر سوئیسی', description: 'نمایش چگونگی عبور یک خطا از لایه‌های دفاعی ناقص برای ایجاد یک حادثه.', generator: generateSwissCheese, renderer: renderSwissCheese, isVisual: true },
        { id: 'fishbone', title: '۸. نمودار استخوان ماهی (Fishbone)', description: 'نمایش بصری علل مختلف یک رویداد، دسته‌بندی شده در گروه‌های اصلی (انسان، ماشین، روش و...).', generator: generateFishbone, renderer: renderFishbone, isVisual: true },
        { id: 'jha', title: '۹. تحلیل خطر شغلی (JHA)', description: 'یک تحلیل بازنگرانه برای شناسایی خطرات مراحل کار و کنترل‌های لازم که باید وجود می‌داشتند.', generator: generateJHA, renderer: renderJHA },
        { id: 'actions', title: '۱۰. اقدامات اصلاحی ترکیبی', description: 'توسعه اقدامات اصلاحی بر اساس لیست نهایی علل تأیید شده توسط تیم شما. (پس از اعتبارسنجی فعال می‌شود)', generator: generateActions, renderer: renderMarkdown, requiresSynthesis: true },
        { id: 'expert', title: '۱۱. مشورت با متخصصین', description: 'دریافت تحلیل و پرسش‌های عمیق از پنل مجازی متخصصان ایمنی بر اساس جزئیات حادثه شما.', generator: generateExpertAnswers, renderer: renderExpertAnswers, requiresSynthesis: true },
        { id: 'scenario', title: '۱۲. سناریونویس فیلم درس‌آموزی', description: 'تولید یک فیلم‌نامه کوتاه و حرفه‌ای بر اساس تحلیل‌های انجام‌شده برای ساخت یک ویدیوی آموزشی تأثیرگذار.', generator: generateFilmScenario, renderer: renderFilmScenario, requiresSynthesis: true }
    ];

    // Utility functions
    function showError(message) {
        elements.errorMessage.textContent = message;
        elements.errorModal.classList.add('visible');
    }

    function showBowtieModal(title, description) {
        elements.bowtieModalTitle.textContent = title;
        elements.bowtieModalDescription.textContent = description;
        elements.bowtieModal.classList.add('visible');
    }

    function showSection(sectionElement) {
        document.querySelectorAll('main > section, #lesson-learned-package').forEach(sec => sec.classList.add('hidden'));
        sectionElement.classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    // Debounced API call function
    function debounce(func, wait) {
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(apiCallTimeout);
                func(...args);
            };
            clearTimeout(apiCallTimeout);
            apiCallTimeout = setTimeout(later, wait);
        };
    }

    // Optimized API call with caching and error handling
    async function callGeminiAPI(prompt, isJson = false) {
        const apiKey = "کلید_API_شخصی_خود_را_اینجا_قرار_دهید";
        
        if (apiKey === "کلید_API_شخصی_خود_را_اینجا_قرار_دهید") {
            showError("خطای راه‌اندازی: کلید API در کد تنظیم نشده است. لطفاً طبق راهنما، کلید خود را در فایل HTML قرار دهید.");
            throw new Error("API Key not set.");
        }

        // Check cache first
        const cacheKey = `api_${btoa(prompt)}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                // Invalid cache, continue with API call
            }
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {}
        };
        if (isJson) payload.generationConfig.responseMimeType = "application/json";

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.json();
                console.error("API Error Response:", errorBody);
                if (response.status === 403) {
                    throw new Error(`خطای دسترسی (403): لطفاً مطمئن شوید که دامنه سایت خود (${window.location.hostname}) را در محدودیت‌های کلید API در کنسول گوگل کلود اضافه کرده‌اید.`);
                }
                throw new Error(`خطا در ارتباط با API: ${response.status}`);
            }

            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content?.parts?.length > 0) {
                const responseText = result.candidates[0].content.parts[0].text;
                // Cache the response for 1 hour
                localStorage.setItem(cacheKey, JSON.stringify(responseText));
                localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
                return responseText;
            }
            if (result.candidates && result.candidates[0].finishReason === 'SAFETY') {
                throw new Error("پاسخ به دلیل محدودیت‌های ایمنی مسدود شد.");
            }
            throw new Error("پاسخ معتبری از API دریافت نشد.");
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    // Clean up old cache entries (older than 1 hour)
    function cleanCache() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('api_') && key.endsWith('_timestamp')) {
                const timestamp = parseInt(localStorage.getItem(key));
                if (now - timestamp > oneHour) {
                    const cacheKey = key.replace('_timestamp', '');
                    localStorage.removeItem(cacheKey);
                    localStorage.removeItem(key);
                }
            }
        }
    }

    // Initialize application
    function init() {
        // Clean cache on startup
        cleanCache();
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize dashboard
        initializeDashboard();
    }

    // Event listeners setup
    function setupEventListeners() {
        // Main analysis button
        elements.startAnalysisBtn.addEventListener('click', handleStartAnalysis);
        
        // Synthesis buttons
        elements.generateSynthesisBtn.addEventListener('click', handleGenerateSynthesis);
        elements.finalizeCausesBtn.addEventListener('click', handleFinalizeCauses);
        elements.generatePackageBtn.addEventListener('click', handleGeneratePackage);
        
        // Export buttons
        elements.downloadPptxBtn.addEventListener('click', handleDownloadPptx);
        elements.printBtn.addEventListener('click', () => window.print());
        
        // Guide modal
        elements.openGuideBtn.addEventListener('click', () => elements.guideModal.classList.add('visible'));
        elements.closeGuideBtns.forEach(btn => btn.addEventListener('click', () => elements.guideModal.classList.remove('visible')));
        elements.guideModal.addEventListener('click', (e) => {
            if (e.target === elements.guideModal) {
                elements.guideModal.classList.remove('visible');
            }
        });
        
        // Template insertion
        elements.insertTemplateBtn.addEventListener('click', insertTemplate);
        
        // Speech to text
        setupSpeechToText();
    }

    // Speech to text setup
    function setupSpeechToText() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            elements.speechToTextBtn.style.display = 'none';
            console.warn('Web Speech API is not supported by this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'fa-IR';
        recognition.interimResults = false;
        let isListening = false;

        recognition.onstart = () => {
            isListening = true;
            elements.speechToTextBtn.classList.add('listening');
            elements.speechToTextBtn.title = 'در حال ضبط... برای توقف کلیک کنید';
        };

        recognition.onend = () => {
            isListening = false;
            elements.speechToTextBtn.classList.remove('listening');
            elements.speechToTextBtn.title = 'نوشتار صوتی';
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            showError(`خطای تشخیص گفتار: ${event.error}`);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const currentText = elements.mainDescriptionInput.value;
            const separator = currentText.trim() ? ' ' : '';
            elements.mainDescriptionInput.value += separator + transcript;
        };

        elements.speechToTextBtn.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    }

    // Template insertion
    function insertTemplate() {
        const template = `**۱. صحنه‌پردازی (وضعیت قبل از حادثه):**
- شرایط محیطی (نور، آب و هوا، سر و صدا): 
- فشار کاری یا زمانی: 
- وضعیت تجهیزات و ابزارها: 
- آیا تغییر جدیدی در فرآیند یا تیم وجود داشت؟ 

**۲. توالی رویدادها (شرح دقیق اقدامات):**
- گام اول: 
- گام دوم: 
- نقطه وقوع حادثه (لحظه انحراف از حالت عادی): 

**۳. پیامدها (نتایج فوری):**
- آسیب به افراد: 
- آسیب به تجهیزات: 
- توقف عملیات: 

**۴. زمینه و منطق پنهان (چرا این اقدامات در آن لحظه منطقی به نظر می‌رسید؟):**
- آیا دستورالعمل‌ها واضح بودند؟ آیا دنبال می‌شدند؟ 
- آیا راه میان‌بری برای انجام سریع‌تر کار وجود داشت؟ 
- آیا تجربه‌های موفق قبلی با همین روش کار، آن را تشویق می‌کرد؟ `;
        
        elements.mainDescriptionInput.value = template;
        elements.mainDescriptionInput.focus();
        elements.guideModal.classList.remove('visible');
    }

    // Start analysis handler
    function handleStartAnalysis() {
        accidentDescription = elements.mainDescriptionInput.value.trim();
        if (!accidentDescription) {
            showError('لطفاً شرح حادثه را وارد کنید.');
            return;
        }
        analysisResults = {};
        synthesisChecklist = [];
        initializeDashboard();
        showSection(document.getElementById('dashboard-section'));
    }

    // Dashboard initialization
    function initializeDashboard() {
        elements.analysisDashboard.innerHTML = '';
        elements.synthesisTriggerContainer.classList.add('hidden');
        
        methodologies.forEach(method => {
            const card = document.createElement('div');
            card.className = 'method-card';
            card.id = `card-${method.id}`;
            card.innerHTML = `
                <div>
                    <h3>${method.title}</h3>
                    <p>${method.description}</p>
                </div>
                <div class="mt-auto">
                    <button class="run-analysis-btn" data-method-id="${method.id}" ${method.requiresSynthesis ? 'disabled' : ''}>شروع تحلیل</button>
                    <div class="card-output mt-4">
                        <div id="output-${method.id}" class="output-placeholder">خروجی تحلیل در اینجا نمایش داده می‌شود.</div>
                    </div>
                </div>`;
            elements.analysisDashboard.appendChild(card);
        });
        
        document.querySelectorAll('.run-analysis-btn').forEach(button => 
            button.addEventListener('click', handleRunAnalysis)
        );
    }

    // Run analysis handler with debouncing
    const handleRunAnalysis = debounce(async function(event) {
        const button = event.target;
        const methodId = button.dataset.methodId;
        const method = methodologies.find(m => m.id === methodId);
        if (!method) return;

        const outputDiv = document.getElementById(`output-${method.id}`);
        button.disabled = true;
        outputDiv.innerHTML = '<div class="loader mx-auto"></div>';

        try {
            const isJsonMethod = ['bowtie', 'expert', 'synthesis', 'swisscheese', 'fishbone'].includes(method.id);
            const resultText = await method.generator();
            const result = isJsonMethod ? JSON.parse(resultText) : resultText;

            analysisResults[method.id] = result;
            outputDiv.innerHTML = method.renderer(result);
            outputDiv.classList.remove('output-placeholder');
            outputDiv.classList.add('dynamic-output');
            checkSynthesisReady();
        } catch (error) {
            console.error(`Analysis failed for ${methodId}:`, error);
            outputDiv.innerHTML = `<p class="text-red-500">تحلیل ناموفق بود: ${error.message}</p>`;
        } finally {
            button.textContent = 'تحلیل مجدد';
            if (!method.requiresSynthesis || (method.requiresSynthesis && analysisResults.validatedCauses)) {
                button.disabled = false;
            }
        }
    }, 300);

    // Check if synthesis is ready
    function checkSynthesisReady() {
        const primaryAnalysesDone = ['5whys', 'hfacs', 'stamp', 'jha', 'fishbone', 'swisscheese'].some(id => analysisResults[id]);
        if (primaryAnalysesDone) {
            elements.synthesisTriggerContainer.classList.remove('hidden');
        }
    }

    // Generate synthesis handler
    async function handleGenerateSynthesis() {
        showSection(document.getElementById('synthesis-section'));
        elements.synthesisChecklistContainer.innerHTML = '<div class="loader mx-auto"></div>';

        try {
            const combinedAnalyses = Object.entries(analysisResults)
                .filter(([key, value]) => !methodologies.find(m => m.id === key).requiresSynthesis && value)
                .map(([key, value]) => `## یافته‌های تحلیل ${key}:\n${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}`)
                .join('\n\n');

            const prompt = `You are a safety analysis synthesizer. From the following combined accident analyses, extract a concise list of unique, potential contributing factors. The entire response, including all string values in the JSON, MUST be in PERSIAN. Respond ONLY with a valid JSON object. Schema: { "findings": [ { "id": number, "finding": "string (the concise factor in Persian)", "source": "string (the source analysis name in Persian, e.g., 'تحلیل ۵ چرا', 'HFACS')" } ] }. Combined Analyses in Persian:\n\n${combinedAnalyses}`;

            const resultText = await callGeminiAPI(prompt, true);
            synthesisChecklist = JSON.parse(resultText).findings;
            renderSynthesisChecklist();
        } catch (error) {
            showError('خطا در ایجاد چک‌لیست تلفیقی: ' + error.message);
            elements.synthesisChecklistContainer.innerHTML = '<p class="text-red-500">ایجاد چک‌لیست ناموفق بود.</p>';
        }
    }

    // Render synthesis checklist
    function renderSynthesisChecklist() {
        elements.synthesisChecklistContainer.innerHTML = '';
        synthesisChecklist.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'checklist-item-new';
            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="source-badge">${item.source}</span>
                </div>
                <p class="finding-text">${item.finding}</p>
                <div class="radio-group-new">
                    <label>
                        <input type="radio" name="check-${index}" value="compliant">
                        <span class="px-4 py-2 border-2 rounded-full">منطبق</span>
                    </label>
                    <label>
                        <input type="radio" name="check-${index}" value="non-compliant">
                        <span class="px-4 py-2 border-2 rounded-full">نامنطبق</span>
                    </label>
                </div>`;
            elements.synthesisChecklistContainer.appendChild(div);
        });
    }

    // Finalize causes handler
    function handleFinalizeCauses() {
        const validatedCauses = synthesisChecklist
            .filter((item, index) => document.querySelector(`input[name="check-${index}"]:checked`)?.value === 'compliant')
            .map(item => item.finding);

        if (validatedCauses.length === 0) {
            showError('لطفاً حداقل یک یافته را به عنوان "منطبق با شواهد" انتخاب کنید.');
            return;
        }

        analysisResults.validatedCauses = validatedCauses;
        methodologies.forEach(method => {
            if (method.requiresSynthesis) {
                document.querySelector(`#card-${method.id} .run-analysis-btn`)?.removeAttribute('disabled');
            }
        });

        elements.generateSynthesisBtn.classList.add('hidden');
        elements.generatePackageBtn?.classList.remove('hidden');

        const existingMessage = elements.synthesisTriggerContainer.querySelector('p');
        if (existingMessage) existingMessage.remove();

        const message = document.createElement('p');
        message.className = 'text-green-600 font-bold mb-4';
        message.textContent = 'چک‌لیست با موفقیت نهایی شد. اکنون می‌توانید تحلیل‌های نهایی را اجرا کرده و سپس بسته آموزشی را ایجاد کنید.';
        elements.synthesisTriggerContainer.prepend(message);

        showSection(document.getElementById('dashboard-section'));
    }

    // Generate package handler
    function handleGeneratePackage() {
        if (Object.keys(analysisResults).length === 0) {
            showError("حداقل یک تحلیل را اجرا کنید تا بتوان بسته آموزشی را ایجاد کرد.");
            return;
        }
        
        elements.llContentWrapper.innerHTML = '';
        let sectionCounter = 1;

        const createSection = (title, content) => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'll-card mb-8 p-4';
            sectionDiv.innerHTML = `
                <div class="ll-section-title"><span>${sectionCounter++}</span>${title}</div>
                <div class="mt-4" id="ll-output-${title.replace(/\s+/g, '-').toLowerCase()}">${content}</div>`;
            return sectionDiv;
        };

        methodologies.forEach(method => {
            if (analysisResults[method.id]) {
                const titleWithoutNumber = method.title.substring(method.title.indexOf('.') + 1).trim();
                const content = method.renderer(analysisResults[method.id]);
                elements.llContentWrapper.appendChild(createSection(titleWithoutNumber, content));
            }
        });

        showSection(elements.lessonLearnedPackage);
    }

    // Download PPTX handler
    async function handleDownloadPptx() {
        if (Object.keys(analysisResults).length === 0) {
            showError("برای دانلود، ابتدا باید حداقل یک تحلیل را اجرا کرده و سپس بسته آموزشی را ایجاد کنید.");
            return;
        }

        // Check if pptxgenjs is loaded
        if (typeof PptxGenJS === 'undefined') {
            showError("کتابخانه پاورپوینت هنوز بارگذاری نشده است. لطفاً چند لحظه صبر کنید و دوباره تلاش کنید.");
            return;
        }

        try {
            let pres = new PptxGenJS();
            pres.rtlMode = true;
            pres.defineLayout({ name: 'TITLE_MASTER', bkgd: '0D1B2A' });
            pres.defineLayout({ name: 'CONTENT_MASTER', bkgd: 'F0F4F8', slideNumber: { x: 9.5, y: '95%', fontFace: 'Vazirmatn', fontSize: 10, color: '415A77', align: 'right' } });

            const slideOptions = {
                title: { x: 0.5, y: 0.3, w: 9, h: 0.75, fontFace: 'Vazirmatn', fontSize: 32, color: '1B263B', bold: true, align: 'right' },
                content: { x: 0.7, y: 1.2, w: 8.6, h: 4.0, fontFace: 'Vazirmatn', fontSize: 12, color: '415A77', rtlMode: true, autoFit: true, valign: 'top' }
            };

            let titleSlide = pres.addSlide({ masterName: 'TITLE_MASTER' });
            titleSlide.addText('منشور ایمنی', { x: 0, y: 1.5, w: '100%', align: 'center', fontFace: 'Vazirmatn', fontSize: 54, color: '00EAD3', bold: true });
            titleSlide.addText('تحلیل جامع حادثه و درس‌آموخته‌ها', { x: 0, y: 2.7, w: '100%', align: 'center', fontFace: 'Vazirmatn', fontSize: 22, color: 'E0E1DD' });

            for (const method of methodologies) {
                if (analysisResults[method.id]) {
                    let slide = pres.addSlide({ masterName: 'CONTENT_MASTER' });
                    const title = method.title.substring(method.title.indexOf('.') + 1).trim();
                    slide.addText(title, slideOptions.title);

                    if (method.isVisual) {
                        try {
                            const element = document.querySelector(`#ll-output-${title.replace(/\s+/g, '-').toLowerCase()} > div`);
                            if (element && typeof html2canvas !== 'undefined') {
                                const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#F0F4F8' });
                                slide.addImage({ data: canvas.toDataURL(), x: 0.5, y: 1.2, w: 9, h: 4.5, sizing: { type: 'contain', w: 9, h: 4.5 } });
                            }
                        } catch (e) { 
                            console.error(`PPTX image generation failed for ${method.id}:`, e); 
                        }
                    } else {
                        const result = analysisResults[method.id];
                        let textObjects = [];
                        if (typeof result === 'string') {
                            let cleanText = result.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s\s+/g, ' ');
                            textObjects.push({ text: cleanText, options: { fontSize: 12, align: 'justify' } });
                        } else if (result.answers) {
                            result.answers.forEach(item => {
                                textObjects.push({ text: item.expert_title, options: { fontSize: 16, bold: true, color: '1E40AF', breakLine: true } });
                                textObjects.push({ text: `سوال: ${item.question}`, options: { fontSize: 13, bold: true, breakLine: true } });
                                textObjects.push({ text: `تحلیل: ${item.answer}`, options: { fontSize: 12, breakLine: true, paraSpaceAfter: 10, align: 'justify' } });
                            });
                        }
                        slide.addText(textObjects, slideOptions.content);
                    }
                }
            }

            let finalSlide = pres.addSlide({ masterName: 'TITLE_MASTER' });
            finalSlide.addText('با سپاس از توجه شما', { x: 0, y: 2.25, w: '100%', align: 'center', fontFace: 'Vazirmatn', fontSize: 36, color: 'E0E1DD' });
            finalSlide.addText('ایمنی، یک ارزش است؛ نه یک اولویت.', { x: 0, y: 3.25, w: '100%', align: 'center', fontFace: 'Vazirmatn', fontSize: 22, color: '00EAD3' });

            pres.writeFile({ fileName: 'تحلیل-حادثه-منشور-ایمنی.pptx' });
        } catch (error) {
            console.error('PPTX generation failed:', error);
            showError('خطا در تولید فایل پاورپوینت: ' + error.message);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export functions for global access
    window.SafetyApp = {
        showError,
        showBowtieModal,
        callGeminiAPI,
        methodologies
    };

})();