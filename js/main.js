// js/main.js
document.addEventListener('DOMContentLoaded', function() {

    // --- 1. Load Shared Navigation ---
    function loadNavigation() {
        const navPlaceholder = document.getElementById('navigation-placeholder');
        if (navPlaceholder) {
            fetch('../partials/navigation.html') // Path relative to individual song pages in /pages/
                .then(response => {
                    if (!response.ok) {
                        console.error('Navigation HTML not found at ../partials/navigation.html. Status:', response.status);
                        // Display a user-friendly error if needed, or just log for dev
                        throw new Error('Navigation HTML not found. Path: ../partials/navigation.html');
                    }
                    return response.text();
                })
                .then(html => {
                    navPlaceholder.innerHTML = html;
                    setActiveNavItem(); // Highlight current page in nav after loading
                })
                .catch(error => {
                    console.error('Error loading navigation:', error);
                    if (navPlaceholder) { // Check again in case it became null
                        navPlaceholder.innerHTML = '<p style="color:#ff8a80;padding:15px;font-style:italic;">Error loading navigation. Please check paths and console.</p>';
                    }
                });
        } else {
            console.warn("Element with ID 'navigation-placeholder' not found in this HTML page. Navigation will not be loaded.");
        }
    }

    // --- 2. Highlight Active Navigation Item ---
    function setActiveNavItem() {
        // Get the filename of the current page (e.g., "babuny.html")
        const currentPageFileName = window.location.pathname.split('/').pop();
        const navLinks = document.querySelectorAll('#sidebar-nav ul li a');

        navLinks.forEach(link => {
            const linkFileName = link.getAttribute('href').split('/').pop();
            if (linkFileName === currentPageFileName) {
                link.classList.add('active-nav-item');
            } else {
                link.classList.remove('active-nav-item');
            }
        });
    }

    // --- 3. Hamburger Menu Toggle ---
    function setupHamburgerMenu() {
        const hamburgerButton = document.getElementById('hamburger-menu');
        const sidebar = document.getElementById('navigation-placeholder'); // This is the <aside> element

        if (hamburgerButton && sidebar) {
            hamburgerButton.addEventListener('click', () => {
                sidebar.classList.toggle('open'); // Toggles sidebar visibility by sliding
                hamburgerButton.classList.toggle('open'); // Toggles hamburger icon animation (to 'X')
                
                // Update ARIA attribute for accessibility
                const isExpanded = hamburgerButton.getAttribute('aria-expanded') === 'true';
                hamburgerButton.setAttribute('aria-expanded', String(!isExpanded));
            });
        } else {
            if (!hamburgerButton) console.warn("Hamburger button with ID '#hamburger-menu' not found. Toggle functionality will not work.");
            if (!sidebar) console.warn("Sidebar element with ID '#navigation-placeholder' not found. Hamburger cannot control it.");
        }
    }

    // --- 4. Generic Text Content Loader (Adjusted Paths) ---
    /**
     * Fetches text content from a file and populates an HTML element.
     * @param {string} elementId - The ID of the HTML element to populate.
     * @param {string} relativeFilePath - The path to the text file (e.g., 'lyrics/file.txt').
     * @param {boolean} isHtmlContent - True if the file content is HTML to be rendered, false for plain text.
     */
    function loadTextContent(elementId, relativeFilePath, isHtmlContent = false) {
        const element = document.getElementById(elementId);
        if (!element) {
            // It's okay for some elements not to exist on every page, so a warn is better than an error here.
            // console.warn(`Element with ID '${elementId}' not found for text loading on this page.`);
            return; 
        }
        
        // Construct full path relative to the project root, 
        // assuming JS is loaded from individual song pages inside the 'pages/' directory.
        const filePath = `../${relativeFilePath}`; // e.g., ../lyrics/babuny_lyrics.txt

        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    // Provide more specific error for 404s, especially on GitHub Pages
                    if (response.status === 404 && window.location.hostname.endsWith('github.io')) {
                         throw new Error(`HTTP error! status: ${response.status} for ${filePath}. ` +
                                       `File not found. Ensure it's correctly named, in the right folder (e.g., '${relativeFilePath.split('/')[0]}/'), ` +
                                       `and that the branch deployed to GitHub Pages contains this file. ` +
                                       `Paths are case-sensitive.`);
                    }
                    throw new Error(`HTTP error! status: ${response.status} for ${filePath}`);
                }
                return response.text();
            })
            .then(text => {
                if (isHtmlContent) {
                    element.innerHTML = text; // For lyrics that might contain <strong>, <em>, etc.
                } else {
                    element.textContent = text; // For plain text like genre descriptions
                }
            })
            .catch(error => {
                console.error(`Error fetching content from ${filePath}:`, error);
                element.innerHTML = `<span style="color: #ff8a80; font-style: italic;">Error loading content. Check console for details.</span>`;
            });
    }

    // --- 5. Suno Version Switching Logic ---
    function setupSunoVersionSwitcher() {
        const sunoVersionCards = document.querySelectorAll('.suno-versions-card');
        sunoVersionCards.forEach(card => {
            const versionButtons = card.querySelectorAll('.version-button');
            const audioPlayerId = versionButtons.length > 0 ? versionButtons[0].dataset.versionTarget : null;
            
            if (!audioPlayerId) {
                // console.warn("Suno card found without data-version-target on its buttons. Skipping switcher setup for this card:", card);
                return;
            }

            const initialAudioPlayer = document.getElementById(audioPlayerId);
            if (!initialAudioPlayer) {
                console.error(`Suno audio player with ID '${audioPlayerId}' not found.`);
                return;
            }
            
            // Add an error listener to the initial player to catch issues with the initially loaded src
            initialAudioPlayer.onerror = function() { 
                console.error("Suno Initial Audio Player Error:", initialAudioPlayer.error, "for src:", initialAudioPlayer.currentSrc); 
            };

            versionButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const audioPlayer = document.getElementById(audioPlayerId); // Get fresh reference
                    if (!audioPlayer) {
                        console.error(`Suno audio player with ID '${audioPlayerId}' not found on button click.`);
                        return;
                    }

                    const currentCardButtons = this.closest('.version-selector').querySelectorAll('.version-button');
                    currentCardButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');

                    const newAudioSrc = this.dataset.audioSrc;
                    if (newAudioSrc) {
                        // Clear previous event handlers for this specific player to avoid multiple firings
                        audioPlayer.oncanplaythrough = null; 
                        audioPlayer.onerror = null; 

                        audioPlayer.oncanplaythrough = function() { 
                            // console.log("Suno audio can play through: ", audioPlayer.src); 
                        };
                        audioPlayer.onerror = function() { 
                            console.error("Suno Audio Player Error on Switch:", audioPlayer.error, "for src:", audioPlayer.currentSrc);
                        };
                        
                        audioPlayer.src = newAudioSrc;
                        audioPlayer.load(); // Tell the browser to load the new source
                        
                        // Optional: auto-play after switching. Add error handling for play()
                        // audioPlayer.play().catch(error => {
                        //     console.error("Error attempting to auto-play Suno audio:", error);
                        // });
                    } else {
                        console.error("No audio source (data-audio-src) found for this Suno version button:", this);
                    }
                });
            });
        });
    }


    // --- Initialize Page ---
    // These functions set up the general page structure and event listeners.
    loadNavigation();
    setupHamburgerMenu();
    setupSunoVersionSwitcher(); 

     // --- Load dynamic text content for the CURRENT page ---
     if (document.getElementById('lyrics-babuny') && document.getElementById('genre-babuny')) {
        loadTextContent('lyrics-babuny', 'lyrics/babuny.txt', true); 
        loadTextContent('genre-babuny', 'genre/babuny.txt', false);      
    } 
    else if (document.getElementById('lyrics-no-surprises') && document.getElementById('genre-no-surprises')) {
        loadTextContent('lyrics-no-surprises', 'lyrics/no_surprises.txt', true); 
        loadTextContent('genre-no-surprises', 'genre/no_surprises.txt', false);
    }
    // TODO: Add a new 'else if' block for your new song page here
    // else if (document.getElementById('lyrics-songX_ID') && document.getElementById('genre-songX_ID')) {
    //     loadTextContent('lyrics-songX_ID', 'lyrics/YOUR_SONGX_LYRICS_FILE.txt', true); 
    //     loadTextContent('genre-songX_ID', 'genre/YOUR_SONGX_GENRE_FILE.txt', false);
    // }
    // ...
});