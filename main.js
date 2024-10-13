// ==UserScript==
// @name         DESENELE DUBLATE MOD
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Скрипт для deseneledublate.com. Добавляет опцию открытия видео в новой вкладке и улучшает функционал
// @author       Viorel Odajiu
// @match        *://*.deseneledublate.com/*
// @match        https://waaw.to/watch_video.php/*
// @icon         https://github.com/newtoneweb/desene_dublate_dot_com_tapermonkey_script/raw/main/icon.svg
// @downloadURL  https://github.com/newtoneweb/desene_dublate_dot_com_tapermonkey_script/raw/main/main.js
// @updateURL    https://github.com/newtoneweb/desene_dublate_dot_com_tapermonkey_script/raw/main/main.js
// @homepage     https://github.com/newtoneweb/desene_dublate_dot_com_tapermonkey_script
// ==/UserScript==

(function () {
    'use strict';

    // ======================== Константы ========================

    // Время задержки для логирования изменений (в миллисекундах)
    const LOG_DELAY = 5000;

    // Базовый URL для генерации ссылки на видео
    const HQQ_BASE_URL = 'https://hqq.tv/watch_video.php?v=';

    // Селекторы элементов, используемых в скрипте
    const SELECTORS = {
        playerOptions: '#playeroptions',
        playerOptionsUl: '#playeroptionsul',
        preloaderText: '#preloader-text',
        openNewTab: '#open-new-tab',
        dooplayPlayerOption: '.dooplay_player_option',
        iframeSelector: '#dooplay_player_response iframe',
        loaderSpan: '#preloader-text .loader',
        shareToolbox: '.addthis_inline_share_toolbox',
        shareExplanation: '#share-explanation',
    };

    // ======================== Инициализация ========================

    // Очистка локального хранилища при запуске скрипта
    localStorage.clear();

    /**
     * Наблюдает за изменениями в указанном iframe.
     * @param {HTMLIFrameElement} iframe - iframe, за которым нужно наблюдать.
     */
    const observeIframe = (iframe) => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Логирование изменений с задержкой
                setTimeout(() => {
                    console.log('Обнаружено изменение:', mutation);
                }, LOG_DELAY);

                // Проверка, что изменённый элемент - HTML документ
                if (mutation.target.tagName === 'HTML') {
                    const addedNode = mutation.addedNodes[0];
                    if (addedNode && addedNode.innerHTML) {
                        const addedNodeHTML = addedNode.innerHTML;

                        // Извлечение URL из скрипта
                        const iframeUrlMatch = addedNodeHTML.match(
                            /self\.location="(https:\/\/hqq\.tv\/player\/embed_player\.php\?vid=[a-zA-Z0-9]+)/
                        );
                        const embeddedUrl = iframeUrlMatch
                            ? iframeUrlMatch[1]
                            : '';

                        if (embeddedUrl) {
                            // Обновление локального хранилища
                            updateLocalStorage(embeddedUrl);
                            // Вставка опции открытия видео
                            insertOption(getVideoUrlFromStorage());
                        }
                    }
                }
            });
        });

        // Настройка наблюдателя
        observer.observe(iframe.contentDocument, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
        });
    };

    /**
     * Добавляет наблюдателя ко всем существующим iframe на странице.
     */
    const observeAllIframes = () => {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe) => {
            iframe.addEventListener('load', () => observeIframe(iframe));
        });
    };

    /**
     * Наблюдает за документом для обнаружения новых iframe.
     */
    const monitorDocumentForIframes = () => {
        const documentObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'IFRAME') {
                        node.addEventListener('load', () =>
                            observeIframe(node)
                        );
                    }
                });
            });
        });

        documentObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
    };

    /**
     * Получает URL видео из iframe или из тега script внутри iframe.
     * @returns {string|null} - URL видео или null, если не найден.
     */
    const getVideoUrl = () => {
        const iframe = document.querySelector(SELECTORS.iframeSelector);
        if (!iframe) return null;

        //  Извлечение URL из iframe если он есть
        const src = iframe.getAttribute('src');
        if (isValidIframeSrc(src)) {
            return src.startsWith('//') ? `https:${src}` : src;
        }

        // Извлечение URL из скрипта, если iframe содержит скрипт
        const script = iframe.contentDocument?.querySelector('script');
        const scriptMatch = script
            ? script.innerHTML.match(/vid=([a-zA-Z0-9]+)/)
            : null;
        return scriptMatch ? `${HQQ_BASE_URL}${scriptMatch[1]}` : null;
    };

    /**
     * Проверяет, является ли src iframe валидным URL.
     * @param {string} src - Значение атрибута src iframe.
     * @returns {boolean} - true, если src валидный, иначе false.
     */
    const isValidIframeSrc = (src) => {
        return (
            src &&
            !src.includes('about:blank') &&
            (src.startsWith('//') || src.startsWith('http'))
        );
    };

    /**
     * Обновляет локальное хранилище с URL видео и ID.
     * @param {string} embeddedUrl - Встроенный URL видео.
     */
    const updateLocalStorage = (embeddedUrl) => {
        localStorage.setItem('embeded-url', embeddedUrl);
        const videoID = embeddedUrl.split('=').pop();
        localStorage.setItem('id', videoID);
        const videoUrl = `${HQQ_BASE_URL}${videoID}`;
        localStorage.setItem('video-url', videoUrl);
    };

    /**
     * Получает URL видео из локального хранилища.
     * @returns {string|null} - URL видео или null.
     */
    const getVideoUrlFromStorage = () => {
        return localStorage.getItem('video-url') || null;
    };

    /**
     * Вставляет опцию открытия видео в новой вкладке.
     * @param {string} videoUrl - URL видео.
     */
    const insertOption = (videoUrl) => {
        const playerOptions = document.querySelector(SELECTORS.playerOptions);
        const playerOptionsUl = document.querySelector(
            SELECTORS.playerOptionsUl
        );

        // Проверка наличия необходимых элементов
        if (!playerOptions || !playerOptionsUl) {
            console.warn(
                'Элементы #playeroptions или #playeroptionsul не найдены.'
            );
            return;
        }

        // Проверка наличия URL и отсутствия уже добавленной опции
        if (videoUrl && !document.querySelector(SELECTORS.openNewTab)) {
            localStorage.setItem('video-url-src', videoUrl);
            const preloaderText = document.querySelector(
                SELECTORS.preloaderText
            );
            if (preloaderText) preloaderText.remove();

            // Вставляем опцию с правильным URL
            playerOptionsUl.insertAdjacentHTML(
                'afterbegin',
                `<li id="open-new-tab" class="dooplay_player_option on">
                    <i class="fas fa-play-circle"></i>
                    <span class="title">
                        <a href="${videoUrl}" target="_blank" rel="noopener noreferrer">
                            Deschide într-un tab nou | <span style="color:#fff; font-weight:normal;">Faceți clic pe pictograma rotundă Play situată într-un loc aleatoriu din imagine.</span>
                        </a>
                    </span>
                </li>`
            );
        }
    };

    /**
     * Вставляет текст предзагрузки во время ожидания URL видео.
     */
    const insertPreloader = () => {
        const playerOptions = document.querySelector(SELECTORS.playerOptions);
        const playerOptionsUl = document.querySelector(
            SELECTORS.playerOptionsUl
        );
        const preloaderText = document.querySelector(SELECTORS.preloaderText);

        // Проверка наличия необходимых элементов и отсутствия уже существующего предзагрузчика
        if (!playerOptions || !playerOptionsUl || preloaderText) return;

        // Вставка предзагрузочного текста
        playerOptionsUl.insertAdjacentHTML(
            'afterbegin',
            `<li id="preloader-text" class="dooplay_player_option">
                <i class="fas fa-play-circle"></i>
                <span class="title">Așteptăm sursa video | <span style="color:#fff; font-weight:normal;">Vă rugăm așteptați.</span></span>
                <span class="loader" style="display: inline-block;"></span>
            </li>`
        );

        // Запуск анимации предзагрузки
        animatePreloader();
    };

    /**
     * Анимирует предзагрузочный текст, добавляя точки.
     */
    const animatePreloader = () => {
        let count = 0;
        const spanElement = document.querySelector(
            `${SELECTORS.preloaderText} .title span`
        );

        if (!spanElement) return; // Ранний выход, если элемент не существует

        setInterval(() => {
            count = (count + 1) % 4;
            const dots = '.'.repeat(count);
            spanElement.textContent =
                spanElement.textContent.replace(/\.+$/, '') + dots;
        }, 1000);
    };

    /**
     * Удаляет нежелательные элементы (рекламу) со страницы.
     */
    const removeAds = () => {
        // Удаляем все iframes, если класс начинается с "content"
        removeElements('iframe[class^="container"]');

        // Удаляем все почтовые ссылки
        removeElements('a[href^="mailto"]');

        // Удаляем все div, начинающиеся с "Video uploaded by"
        removeElements('div', 'Video uploaded by');
    };

    /**
     * Удаляет элементы по селектору или по совпадению текстового содержимого.
     * @param {string} selector - CSS селектор для элементов.
     * @param {string} [startsWith] - (Необязательно) Начальная строка текстового содержимого.
     * Если не указана, удаляются все элементы по селектору.
     */
    const removeElements = (selector, startsWith) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
            if (!startsWith || element.textContent.startsWith(startsWith)) {
                setTimeout(() => {
                    element.remove();
                }, 1000);
            }
        });
    };

    /**
     * Основной цикл, который проверяет URL видео и вставляет опции.
     */
    const mainLoop = () => {
        const videoUrl = getVideoUrl() || getVideoUrlFromStorage();
        if (!videoUrl) {
            insertPreloader();
            setTimeout(mainLoop, 1000); // Повторить каждые секунду, если URL видео еще не доступен
        } else {
            insertOption(videoUrl); // Вставляем опцию для открытия видео, когда URL найден
        }
    };

    /**
     * Обработчик кликов для открытия видео в новой вкладке.
     * Использует делегирование событий на контейнере playeroptions.
     */
    const handlePlayerOptionsClick = (event) => {
        const openNewTabLink = document.querySelector(
            `${SELECTORS.openNewTab} a`
        );
        if (event.target === openNewTabLink) {
            event.preventDefault();
            window.open(openNewTabLink.href, '_blank');
        }
    };

    /**
     * Инициализация скрипта.
     */
    const init = () => {
        removeAds();
        observeAllIframes();
        monitorDocumentForIframes();
        mainLoop();

        // Добавление слушателя кликов на контейнер playeroptions
        const playerOptions = document.querySelector(SELECTORS.playerOptions);
        if (playerOptions) {
            playerOptions.addEventListener('click', handlePlayerOptionsClick);
        }
    };

    // Запуск инициализации после загрузки документа
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
