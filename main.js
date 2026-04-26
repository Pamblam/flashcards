// Flashcard App Main JS
const app = document.getElementById('app');
const datasetsDir = 'datasets/';

// Hardcoded dataset list for now (could be dynamic with backend or directory listing)
const datasets = [
	{ name: 'AWS Machine Learning Engineer - Part 1', file: 'aws-mle-part1.json' },
	{ name: 'AWS Machine Learning Engineer - Part 2', file: 'aws-mle-part2.json' }
];

let currentDataset = null;
let cards = [];
let currentIndex = 0;
let showDescription = false;
let mode = 'term-first'; // 'term-first' or 'description-first'

function getStatsKey(dataset, term) {
	return `flashcard_stats_${dataset}_${term}`;
}

function getStats(dataset, term) {
	const key = getStatsKey(dataset, term);
	const stats = localStorage.getItem(key);
	return stats ? JSON.parse(stats) : { correct: 0, incorrect: 0 };
}

function setStats(dataset, term, stats) {
	const key = getStatsKey(dataset, term);
	localStorage.setItem(key, JSON.stringify(stats));
}

function renderDatasetChooser() {
	app.innerHTML = `
		<div class="card">
			<div class="card-body">
				<h5 class="card-title">Choose a Flashcard Collection</h5>
				<div class="list-group mt-3">
					${datasets.map((ds, i) => `
						<button class="list-group-item list-group-item-action" data-index="${i}">${ds.name}</button>
					`).join('')}
				</div>
			</div>
		</div>
	`;
	document.querySelectorAll('.list-group-item').forEach(btn => {
		btn.addEventListener('click', e => {
			const idx = btn.getAttribute('data-index');
			loadDataset(datasets[idx]);
		});
	});
}

function loadDataset(dataset) {
	fetch(datasetsDir + dataset.file)
		.then(res => res.json())
		.then(data => {
			currentDataset = dataset;
			cards = shuffle([...data]);
			currentIndex = 0;
			showDescription = false;
			renderFlashcard();
		})
		.catch(() => {
			app.innerHTML = `<div class="alert alert-danger">Failed to load dataset.</div>`;
		});
}

function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function renderFlashcard() {
	if (!cards.length) {
		app.innerHTML = `<div class="alert alert-warning">No cards in this dataset.</div>`;
		return;
	}
	if (currentIndex >= cards.length) {
		app.innerHTML = `
			<div class="card">
				<div class="card-body">
					<h5 class="card-title">Done!</h5>
					<button class="btn btn-primary mt-3" id="restart">Restart</button>
					<button class="btn btn-secondary mt-3 ms-2" id="choose">Choose Another Collection</button>
				</div>
			</div>
		`;
		document.getElementById('restart').onclick = () => {
			cards = shuffle([...cards]);
			currentIndex = 0;
			showDescription = false;
			renderFlashcard();
		};
		document.getElementById('choose').onclick = () => {
			renderDatasetChooser();
		};
		return;
	}

	const card = cards[currentIndex];
	const stats = getStats(currentDataset.file, card.term);
	// Calculate overall correctness percentage
	let totalCorrect = 0, totalIncorrect = 0;
	cards.forEach(c => {
		const s = getStats(currentDataset.file, c.term);
		totalCorrect += s.correct;
		totalIncorrect += s.incorrect;
	});
	const totalAnswered = totalCorrect + totalIncorrect;
	const percent = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
	const overallHtml = `
		<div class="mb-3 d-flex align-items-center gap-3">
			<label for="modeSelect" class="form-label mb-0"><strong>Mode:</strong></label>
			<select id="modeSelect" class="form-select form-select-sm w-auto">
				<option value="term-first"${mode === 'term-first' ? ' selected' : ''}>Term First</option>
				<option value="description-first"${mode === 'description-first' ? ' selected' : ''}>Description First</option>
			</select>
			<span class="ms-3"><strong>Overall Correctness:</strong> <span class="badge bg-info text-dark">${percent}%</span>
			<span class="ms-2 text-muted">(${totalCorrect} correct / ${totalAnswered} answered)</span></span>
		</div>
	`;

	// Flip card markup (only term and description inside)
	let flipCardFront = '', flipCardBack = '';
	if (mode === 'term-first') {
		flipCardFront = `<h5 class="card-title mb-0">${card.term}</h5>`;
		flipCardBack = `<div class="mb-0"><strong>Description:</strong><br>${card.description}</div>`;
	} else {
		flipCardFront = `<div class="mb-0"><strong>Description:</strong><br>${card.description}</div>`;
		flipCardBack = `<h5 class="card-title mb-0">${card.term}</h5>`;
	}
	const flipCardHtml = `
		<div class="d-flex justify-content-center my-4">
			<div class="flip-card${showDescription ? ' flipped' : ''}" id="flipCard">
				<div class="flip-card-inner">
					<div class="flip-card-front d-flex flex-column justify-content-center align-items-center">
						${flipCardFront}
					</div>
					<div class="flip-card-back d-flex flex-column justify-content-center align-items-center">
						${flipCardBack}
					</div>
				</div>
			</div>
		</div>
	`;

	// All terms with stats (no highlight for current)
	const allTermsHtml = `
		<div class="mt-4">
			<h6>All Terms in Set</h6>
			<div class="list-group">
				${cards.map((c, idx) => {
					const s = getStats(currentDataset.file, c.term);
					return `<div class="list-group-item d-flex justify-content-between align-items-center" style="cursor:pointer;" data-term-idx="${idx}">
						<span>${c.term}</span>
						<span>
							<span class="badge bg-success">${s.correct}</span>
							<span class="badge bg-danger ms-1">${s.incorrect}</span>
						</span>
					</div>`;
				}).join('')}
			</div>
		</div>
	`;

	app.innerHTML = `
		<div class="card">
			<div class="card-body">
				${overallHtml}
				<div class="d-flex justify-content-between align-items-center mb-2">
					<button class="btn btn-outline-secondary btn-sm" id="backBtn">&laquo; Back</button>
					<span>Card ${currentIndex + 1} of ${cards.length}</span>
					<button class="btn btn-outline-secondary btn-sm" id="forwardBtn">Forward &raquo;</button>
				</div>
				${flipCardHtml}
				<div class="d-flex flex-wrap justify-content-center align-items-center gap-2 my-3">
					<span class="badge bg-success">Correct: ${stats.correct}</span>
					<span class="badge bg-danger">Incorrect: ${stats.incorrect}</span>
				</div>
				<div class="d-flex flex-wrap justify-content-center align-items-center gap-2 mb-3">
					${!showDescription ? `
						<button class="btn btn-primary" id="show">Show ${mode === 'term-first' ? 'Description' : 'Term'}</button>
						<button class="btn btn-secondary" id="skip">Skip</button>
					` : `
						<button class="btn btn-success" id="correct">Correct</button>
						<button class="btn btn-danger" id="incorrect">Incorrect</button>
						<button class="btn btn-secondary" id="skipBack">Skip</button>
					`}
				</div>
				${allTermsHtml}
			</div>
		</div>
	`;

	// Navigation buttons
	document.getElementById('backBtn').onclick = () => {
		if (currentIndex > 0) {
			showDescription = false;
			currentIndex--;
			renderFlashcard();
		}
	};
	document.getElementById('forwardBtn').onclick = () => {
		if (currentIndex < cards.length - 1) {
			showDescription = false;
			currentIndex++;
			renderFlashcard();
		}
	};

	// Click on term in list
	document.querySelectorAll('.list-group-item[data-term-idx]').forEach(item => {
		item.onclick = () => {
			const idx = parseInt(item.getAttribute('data-term-idx'));
			showDescription = false;
			currentIndex = idx;
			renderFlashcard();
		};
	});

	// Flip card logic
	const flipCard = document.getElementById('flipCard');
	if (flipCard) {
		// Show Description/Term button (outside)
		const showBtn = document.getElementById('show');
		if (showBtn) {
			showBtn.onclick = () => {
				showDescription = true;
				renderFlashcard();
			};
		}
		// Skip button (outside)
		const skipBtn = document.getElementById('skip');
		if (skipBtn) {
			skipBtn.onclick = () => {
				showDescription = false;
				currentIndex++;
				renderFlashcard();
			};
		}
		// Correct/Incorrect/Skip (outside, after flip)
		const correctBtn = document.getElementById('correct');
		if (correctBtn) {
			correctBtn.onclick = () => {
				const stats = getStats(currentDataset.file, card.term);
				stats.correct++;
				setStats(currentDataset.file, card.term, stats);
				showDescription = false;
				currentIndex++;
				renderFlashcard();
			};
		}
		const incorrectBtn = document.getElementById('incorrect');
		if (incorrectBtn) {
			incorrectBtn.onclick = () => {
				const stats = getStats(currentDataset.file, card.term);
				stats.incorrect++;
				setStats(currentDataset.file, card.term, stats);
				showDescription = false;
				currentIndex++;
				renderFlashcard();
			};
		}
		const skipBackBtn = document.getElementById('skipBack');
		if (skipBackBtn) {
			skipBackBtn.onclick = () => {
				showDescription = false;
				currentIndex++;
				renderFlashcard();
			};
		}
	}

	// Mode dropdown
	const modeSelect = document.getElementById('modeSelect');
	if (modeSelect) {
		modeSelect.onchange = (e) => {
			mode = modeSelect.value;
			showDescription = false;
			renderFlashcard();
		};
	}
}

// Add flip card CSS to head if not already present
function injectFlipCardCSS() {
	if (document.getElementById('flip-card-css')) return;
	const style = document.createElement('style');
	style.id = 'flip-card-css';
	style.innerHTML = `
		.flip-card {
			background-color: transparent;
			width: 350px;
			height: 220px;
			perspective: 1000px;
			border: none;
		}
		.flip-card-inner {
			position: relative;
			width: 100%;
			height: 100%;
			text-align: center;
			transition: transform 0.6s cubic-bezier(.4,2,.6,1);
			transform-style: preserve-3d;
		}
		.flip-card.flipped .flip-card-inner {
			transform: rotateY(180deg);
		}
		.flip-card-front, .flip-card-back {
			position: absolute;
			width: 100%;
			height: 100%;
			backface-visibility: hidden;
			background: #fff;
			border-radius: 1rem;
			box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.1);
			padding: 2rem 1rem 1rem 1rem;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
		}
		.flip-card-front {
			z-index: 2;
		}
		.flip-card-back {
			transform: rotateY(180deg);
			z-index: 3;
		}
	`;
	document.head.appendChild(style);
}

injectFlipCardCSS();
// Start app
renderDatasetChooser();
