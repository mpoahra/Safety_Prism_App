// Analysis Generation Functions
// Optimized with better error handling and performance

// Analysis generation functions
async function generateNarrative() {
    const prompt = `Transform this technical incident report into a compelling, human-focused narrative. The entire response MUST be a single block of text in PERSIAN. Report in Persian: "${accidentDescription}"`;
    return await callGeminiAPI(prompt);
}

async function generateBowTie() {
    const prompt = `You are an expert safety analyst. Analyze the following accident description. Respond ONLY with a valid JSON object, and ensure all text values are in PERSIAN. Schema: { "topEvent": "string", "threats": [{"title": "string", "description": "string"}], "preventiveBarriers": [{"title": "string", "description": "string"}], "consequences": [{"title": "string", "description": "string"}], "recoveryBarriers": [{"title": "string", "description": "string"}] }. Accident Description in Persian: "${accidentDescription}"`;
    return await callGeminiAPI(prompt, true);
}

async function generate5Whys() {
    const prompt = `Perform a '5 Whys' analysis for the following incident, starting with a clear problem statement. The entire response MUST be in PERSIAN using Markdown. Incident in Persian: "${accidentDescription}"`;
    return await callGeminiAPI(prompt);
}

async function generateHfacs() {
    const prompt = `Analyze the following incident using the HFACS framework. Provide a structured analysis. The entire response MUST be in PERSIAN using Markdown. Incident in Persian: "${accidentDescription}"`;
    return await callGeminiAPI(prompt);
}

async function generateSTAMP() {
    const prompt = `Analyze this incident using STAMP principles (Inadequate Controls, Inadequate Feedback, Flawed Control Structure). The entire response MUST be in PERSIAN using Markdown. Incident in Persian: "${accidentDescription}"`;
    return await callGeminiAPI(prompt);
}

async function generateFRAM() {
    const prompt = `Analyze this incident using FRAM principles. Identify key functions and how everyday performance variability could have led to failure. Do not look for root causes. The entire response MUST be in PERSIAN using Markdown. Incident in Persian: "${accidentDescription}"`;
    return await callGeminiAPI(prompt);
}

async function generateSwissCheese() {
    const prompt = `Analyze the following incident using James Reason's Swiss Cheese Model. Identify 3 to 5 layers of defense and the holes (failures) in each. Respond ONLY with a valid JSON object, with all text in PERSIAN. Schema: { "layers": [ { "name": "string (Defense Layer Name)", "description": "string (What this layer is supposed to do)", "holes": ["string (Specific failure/hole in this layer)"] } ] }. Incident: "${accidentDescription}"`;
    return await callGeminiAPI(prompt, true);
}

async function generateFishbone() {
    const prompt = `Create a detailed Fishbone (Ishikawa) diagram for the following incident. Categorize causes under Man, Machine, Method, Material, Environment, and Management. Provide 2-3 causes for at least 4 categories. Respond ONLY with a valid JSON object, with all text in PERSIAN. Schema: { "problem": "string (The main problem/event)", "categories": { "انسان": ["string (cause)"], "ماشین": ["string (cause)"], "روش": ["string (cause)"], "محیط": ["string (cause)"], "مدیریت": ["string (cause)"], "مواد": ["string (cause)"] } }. Incident: "${accidentDescription}"`;
    return await callGeminiAPI(prompt, true);
}

async function generateJHA() {
    const prompt = `Perform a retrospective Job Hazard Analysis (JHA) for the tasks described in the incident. Format the output as a Markdown table with columns for "مرحله کار", "خطر شناسایی‌شده", and "اقدام کنترلی لازم". The entire response MUST be in PERSIAN. Incident: "${accidentDescription}"`;
    return await callGeminiAPI(prompt);
}

async function generateActions() {
    if (!analysisResults.validatedCauses) {
        throw new Error("ابتدا باید چک‌لیست یافته‌ها را نهایی کنید.");
    }
    const prompt = `Based on the following list of VERIFIED contributing factors from a real-world incident, develop a comprehensive set of corrective actions using the hierarchy of controls. The entire response MUST be in PERSIAN using Markdown. Verified Factors: \n- ${analysisResults.validatedCauses.join('\n- ')}`;
    return await callGeminiAPI(prompt);
}

async function generateExpertAnswers() {
    if (!analysisResults.validatedCauses) {
        throw new Error("ابتدا باید چک‌لیست یافته‌ها را نهایی کنید.");
    }
    const prompt = `You are a panel of three world-class safety experts (a Human Factors specialist, a Process Safety Engineer, a Systems Theorist). Based on the incident description and VERIFIED factors, generate three distinct 'Expert Answers'. Respond ONLY with a valid JSON object, with all text in PERSIAN. Schema: { "answers": [ { "expert_title": "string", "question": "string", "answer": "string" } ] }. Incident: "${accidentDescription}". Verified Factors: \n- ${analysisResults.validatedCauses.join('\n- ')}`;
    return await callGeminiAPI(prompt, true);
}

async function generateFilmScenario() {
    if (!analysisResults.validatedCauses || !analysisResults.narrative) {
        throw new Error("برای تولید سناریو، ابتدا باید تحلیل‌های «روایت‌سازی» و «اعتبارسنجی علل» را انجام دهید.");
    }
    const prompt = `You are a professional screenwriter. Write a short film screenplay (5-7 scenes) in PERSIAN based on the provided accident data. Format it using standard screenplay conventions (SCENE HEADING, ACTION, CHARACTER, DIALOGUE). Context: - Accident Narrative: ${analysisResults.narrative} - Verified Root Causes: ${analysisResults.validatedCauses.join(', ')} - Corrective Actions: ${analysisResults.actions || 'Not available'}. The entire output MUST be a single block of text in PERSIAN.`;
    return await callGeminiAPI(prompt);
}

// Rendering functions
function renderNarrative(data) {
    return `<div class="prose max-w-none prose-lg text-justify"><p class="italic text-gray-700 leading-relaxed">${data}</p></div>`;
}

function renderMarkdown(data) {
    let html = data
        .replace(/^### (.*$)/gim, '<h4 class="font-bold text-lg mt-4 mb-1">$1</h4>')
        .replace(/^## (.*$)/gim, '<h3 class="font-bold text-xl mt-5 mb-2">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^\* (.*$)/gim, '<li>$1</li>');

    html = html.replace(/<\/li><br>/g, '</li>');
    html = html.replace(/<li>/g, '<li class="list-disc mr-6 mb-2">');

    const tableRegex = /\|(.+)\|\n\|( *[-:]+ *\|)+([\s\S]*?)(?=\n\n|\n\s*$|\<br\>)/g;
    html = html.replace(tableRegex, (match, headerRow, separator, bodyRows) => {
        let table = '<table class="jha-table"><thead><tr>';
        const headers = headerRow.split('|').slice(1, -1).map(h => `<th>${h.trim()}</th>`).join('');
        table += headers + '</tr></thead><tbody>';
        const rows = bodyRows.trim().split('\n');
        rows.forEach(row => {
            if (!row.trim() || row.includes('---')) return;
            table += '<tr>';
            const cells = row.split('|').slice(1, -1).map(c => `<td>${c.trim()}</td>`).join('');
            table += cells + '</tr>';
        });
        table += '</tbody></table>';
        return table;
    });

    return `<div class="prose prose-lg max-w-none text-justify">${html.replace(/\n/g, '<br>')}</div>`;
}

function renderBowTie(data) {
    const wrapper = document.createElement('div');
    wrapper.className = 'bow-tie-wrapper';
    const container = document.createElement('div');
    container.className = 'bow-tie-container';
    const leftWing = document.createElement('div');
    leftWing.className = 'bow-tie-wing bow-tie-left-wing';
    const rightWing = document.createElement('div');
    rightWing.className = 'bow-tie-wing bow-tie-right-wing';
    const knot = document.createElement('div');
    knot.className = 'bow-tie-knot';
    knot.textContent = data.topEvent;

    const addElement = (parent, type, item) => {
        const el = document.createElement('div');
        el.className = `bow-tie-element bow-tie-${type}`;
        el.textContent = item.title;
        el.onclick = () => window.SafetyApp.showBowtieModal(item.title, item.description);
        parent.appendChild(el);
    };

    data.threats.forEach((threat, index) => {
        const prevention = data.preventiveBarriers[index] || {title: 'نامشخص', description:''};
        const path = document.createElement('div');
        path.className = 'bow-tie-path';
        addElement(path, 'threat', threat);
        path.appendChild(document.createElement('div')).className = 'bow-tie-connector';
        addElement(path, 'prevention', prevention);
        leftWing.appendChild(path);
    });

    data.consequences.forEach((consequence, index) => {
        const recovery = data.recoveryBarriers[index] || {title: 'نامشخص', description:''};
        const path = document.createElement('div');
        path.className = 'bow-tie-path';
        addElement(path, 'recovery', recovery);
        path.appendChild(document.createElement('div')).className = 'bow-tie-connector';
        addElement(path, 'consequence', consequence);
        rightWing.appendChild(path);
    });

    container.append(leftWing, knot, rightWing);
    wrapper.appendChild(container);
    return wrapper.outerHTML;
}

function renderExpertAnswers(data) {
    let html = '<div class="space-y-6">';
    data.answers.forEach(item => {
        html += `<div class="expert-answer border-r-4 border-blue-600 pr-4"><h5 class="font-bold text-blue-800 text-lg">${item.expert_title}</h5><p class="text-gray-800 mt-2"><strong class="text-gray-900">سوال کلیدی:</strong> ${item.question}</p><div class="prose prose-lg max-w-none text-justify text-gray-700 mt-1"><strong class="text-gray-900">تحلیل:</strong> ${item.answer}</div></div>`;
    });
    html += '</div>';
    return html;
}

function renderFilmScenario(data) {
    const pre = document.createElement('pre');
    pre.textContent = data;
    const container = document.createElement('div');
    container.className = 'screenplay-output';
    container.appendChild(pre);
    return container.outerHTML;
}

function renderSwissCheese(data) {
    const container = document.createElement('div');
    container.className = 'swiss-cheese-model';
    data.layers.forEach((layer, layerIndex) => {
        const slice = document.createElement('div');
        slice.className = 'cheese-slice';
        slice.style.transform = `translateX(${layerIndex * -25}px) rotateY(-15deg)`;
        slice.style.zIndex = data.layers.length - layerIndex;

        const label = document.createElement('div');
        label.className = 'slice-label';
        label.textContent = layer.name;
        slice.appendChild(label);

        layer.holes.forEach((holeText, holeIndex) => {
            const hole = document.createElement('div');
            hole.className = 'hole';
            const top = 30 + (holeIndex * 25) % 40;
            const left = 50 + (holeIndex * 15 - layerIndex * 10) % 30;
            hole.style.top = `${top}%`;
            hole.style.left = `${left}%`;

            const holeLabel = document.createElement('div');
            holeLabel.className = 'hole-label';
            holeLabel.textContent = holeText;
            hole.appendChild(holeLabel);
            holeLabel.style.bottom = '28px';

            slice.appendChild(hole);
        });
        container.appendChild(slice);
    });
    return container.outerHTML;
}

function renderFishbone(data) {
    const wrapper = document.createElement('div');
    wrapper.className = 'fishbone-wrapper';
    const container = document.createElement('div');
    container.className = 'fishbone-diagram';

    const leftBones = document.createElement('div');
    leftBones.className = 'fishbone-bones';

    const rightBones = document.createElement('div');
    rightBones.className = 'fishbone-bones';

    const spineContainer = document.createElement('div');
    spineContainer.className = 'fishbone-spine';
    const head = document.createElement('div');
    head.className = 'fishbone-head';
    head.textContent = data.problem;
    spineContainer.appendChild(head);

    const categories = Object.keys(data.categories);
    categories.forEach((category, index) => {
        const causes = data.categories[category];
        if (!causes || causes.length === 0) return;

        const bone = document.createElement('div');
        const causesList = document.createElement('ul');
        causesList.className = 'causes';
        causes.forEach(cause => {
            const li = document.createElement('li');
            li.textContent = cause;
            causesList.appendChild(li);
        });

        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = category;

        if (index % 2 === 0) {
            bone.className = 'fishbone-bone fishbone-bone-left';
            bone.append(causesList, label);
            leftBones.appendChild(bone);
        } else {
            bone.className = 'fishbone-bone fishbone-bone-right';
            bone.append(label, causesList);
            rightBones.appendChild(bone);
        }
    });

    container.append(leftBones, spineContainer, rightBones);
    wrapper.appendChild(container);
    return wrapper.outerHTML;
}

function renderJHA(data) {
    return renderMarkdown(data);
}