// app.js for K3-Drill (V2 - Upgraded Review Mode)

document.addEventListener('DOMContentLoaded', () => {
    
    // --- State ---
    let currentIndex = 0;
    let currentMode = 'practice'; // 'practice' or 'review'

    // --- DOM Elements ---
    const questionArea = document.getElementById('question-area');
    const footer = document.querySelector('.app-footer'); // 获取整个 footer
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const counterEl = document.getElementById('counter');
    const practiceModeBtn = document.getElementById('practice-mode-btn');
    const reviewModeBtn = document.getElementById('review-mode-btn');

    // --- Functions ---
    const renderQuestions = () => {
        questionArea.innerHTML = '';
        k3_questions.forEach((q, index) => {
            const isMulti = q.correctAnswer.includes('┋');
            const inputType = isMulti ? 'checkbox' : 'radio';

            const optionsHTML = q.options.map((opt, i) => {
                const optionChar = opt.charAt(0);
                return `
                <label class="option-item" for="q${index}-opt${i}" data-option-char="${optionChar}">
                    <input type="${inputType}" id="q${index}-opt${i}" name="q${index}" value="${optionChar}">
                    ${opt}
                </label>
            `}).join('');

            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            questionDiv.id = `q-${index}`;
            questionDiv.innerHTML = `
                <div class="question-title">${q.title}</div>
                <div class="question-image"><img src="${q.image}" alt="题目图片"></div>
                <div class="options-list">${optionsHTML}</div>
                <div class="action-buttons">
                    <button class="submit-btn">确定</button>
                    <button class="reveal-btn">查看答案</button>
                </div>
                <div class="answer-area"></div>
            `;
            questionArea.appendChild(questionDiv);
        });
    };

    const showQuestion = (index) => {
        currentIndex = index;
        document.querySelectorAll('.question-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
        
        counterEl.textContent = `${index + 1} / ${k3_questions.length}`;
        prevBtn.disabled = index === 0;
        nextBtn.disabled = index === k3_questions.length - 1;
    };

    const checkAnswer = (index) => {
        const questionData = k3_questions[index];
        const questionEl = document.getElementById(`q-${index}`);
        const answerArea = questionEl.querySelector('.answer-area');
        
        const selectedValues = Array.from(questionEl.querySelectorAll('input:checked')).map(input => input.value).sort();
        const correctValues = questionData.correctAnswer.split('┋').map(ans => ans.charAt(0)).sort();
        
        const isCorrect = selectedValues.length === correctValues.length && selectedValues.every((v, i) => v === correctValues[i]);

        answerArea.innerHTML = `<strong>正确答案：</strong>${questionData.correctAnswer}`;
        answerArea.className = `answer-area ${isCorrect ? 'correct' : 'incorrect'}`;
    };

    const revealAnswer = (index) => {
        const questionEl = document.getElementById(`q-${index}`);
        const answerArea = questionEl.querySelector('.answer-area');
        answerArea.innerHTML = `<strong>正确答案：</strong>${k3_questions[index].correctAnswer}`;
        answerArea.className = 'answer-area revealed';
    };

    // --- 全新升级的 setMode 函数 ---
    const setMode = (mode) => {
        currentMode = mode;
        practiceModeBtn.classList.toggle('active', mode === 'practice');
        reviewModeBtn.classList.toggle('active', mode === 'review');

        if (mode === 'review') {
            // --- 速览模式逻辑 ---
            footer.style.display = 'none'; // 隐藏底部分页导航
            document.querySelectorAll('.question-item').forEach((item, index) => {
                item.classList.add('active'); // 显示所有题目
                item.querySelector('.action-buttons').style.display = 'none'; // 隐藏操作按钮
                const answerArea = item.querySelector('.answer-area');
                answerArea.style.display = 'none'; // 隐藏文字版答案区域，让高亮更突出
                
                // 智能高亮正确选项
                const questionData = k3_questions[index];
                const correctValues = questionData.correctAnswer.split('┋').map(ans => ans.charAt(0));
                
                item.querySelectorAll('.option-item').forEach(label => {
                    const optionChar = label.dataset.optionChar;
                    // 如果该选项的字母在正确答案数组中，则高亮
                    if (correctValues.includes(optionChar)) {
                        label.classList.add('correct-highlight');
                    } else {
                        label.classList.remove('correct-highlight'); // 确保清除旧的高亮
                    }
                });
            });
        } else {
            // --- 做题模式逻辑 ---
            footer.style.display = 'flex'; // 恢复显示底部分页导航
            document.querySelectorAll('.question-item').forEach(item => {
                item.querySelector('.action-buttons').style.display = 'flex'; // 恢复操作按钮
                item.querySelector('.answer-area').style.display = 'none'; // 隐藏答案区
                item.querySelectorAll('.option-item').forEach(label => {
                    label.classList.remove('correct-highlight'); // 清除所有高亮
                });
            });
            showQuestion(currentIndex); // 切回到单题显示模式
        }
    };

    // --- Event Listeners ---
    prevBtn.addEventListener('click', () => showQuestion(currentIndex - 1));
    nextBtn.addEventListener('click', () => showQuestion(currentIndex + 1));
    practiceModeBtn.addEventListener('click', () => setMode('practice'));
    reviewModeBtn.addEventListener('click', () => setMode('review'));

    questionArea.addEventListener('click', (e) => {
        if (currentMode !== 'practice') return; // 在速览模式下禁用点击事件

        const target = e.target;
        if (target.classList.contains('submit-btn')) {
            checkAnswer(currentIndex);
        } else if (target.classList.contains('reveal-btn')) {
            revealAnswer(currentIndex);
        } else if (target.closest('.option-item')) {
            const label = target.closest('.option-item');
            const input = label.querySelector('input');
            if(input.type === 'radio') {
                label.parentElement.querySelectorAll('.option-item').forEach(l => l.classList.remove('selected'));
            }
            label.classList.toggle('selected', input.checked);
        }
    });

    // --- Initial Load ---
    renderQuestions();
    showQuestion(0);
    setMode('practice');
});