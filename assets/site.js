import { clearChatHistory, readChatHistory, writeChatHistory } from './chat-history.js';
import { parseChatMarkdown } from './chat-markdown.js';

document.documentElement.classList.add('js-ready');

const revealItems = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

document.querySelectorAll('[data-contact-disabled]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    document.querySelector('[data-contact-note]')?.focus({ preventScroll: false });
  });
});

document.querySelectorAll('[data-platform-mockup]').forEach((mockup) => {
  const tabs = [...mockup.querySelectorAll('[data-platform-tab]')];
  const panels = [...mockup.querySelectorAll('[data-platform-panel]')];
  if (tabs.length === 0 || panels.length !== tabs.length) return;

  const activate = (pageId, shouldFocus = false) => {
    const activeTab = tabs.find((tab) => tab.dataset.platformTab === pageId);
    if (!(activeTab instanceof HTMLButtonElement)) return;

    tabs.forEach((tab) => {
      const isActive = tab === activeTab;
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      panel.hidden = panel.dataset.platformPanel !== pageId;
    });

    if (shouldFocus) activeTab.focus({ preventScroll: true });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab.dataset.platformTab));
    tab.addEventListener('keydown', (event) => {
      let targetIndex = null;
      if (event.key === 'ArrowRight') targetIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') targetIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') targetIndex = 0;
      if (event.key === 'End') targetIndex = tabs.length - 1;
      if (targetIndex === null) return;

      event.preventDefault();
      activate(tabs[targetIndex].dataset.platformTab, true);
    });
  });
});

document.querySelectorAll('[data-carousel]').forEach((carousel) => {
  const viewport = carousel.querySelector('[data-carousel-viewport]');
  const slides = [...carousel.querySelectorAll('[data-carousel-slide]')];
  const dots = [...carousel.querySelectorAll('[data-carousel-dot]')];
  const controls = carousel.querySelector('[data-carousel-controls]');
  const previous = carousel.querySelector('[data-carousel-previous]');
  const next = carousel.querySelector('[data-carousel-next]');
  const status = carousel.querySelector('[data-carousel-status]');
  const openers = [...carousel.querySelectorAll('[data-carousel-open]')];
  const photoDialog = carousel.querySelector('[data-photo-dialog]');
  const photoImage = carousel.querySelector('[data-photo-image]');
  const photoCaption = carousel.querySelector('[data-photo-caption]');
  const photoStatus = carousel.querySelector('[data-photo-status]');
  const photoPrevious = carousel.querySelector('[data-photo-previous]');
  const photoNext = carousel.querySelector('[data-photo-next]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeIndex = 0;
  let activePhotoIndex = 0;
  let overflowing = false;
  let scrollFrame = null;
  let photoReturnFocus = null;

  if (!(viewport instanceof HTMLElement) || slides.length === 0) return;

  const updateState = (index) => {
    activeIndex = Math.max(0, Math.min(index, slides.length - 1));
    dots.forEach((dot, dotIndex) => {
      if (dotIndex === activeIndex) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    if (previous instanceof HTMLButtonElement) previous.disabled = !overflowing;
    if (next instanceof HTMLButtonElement) next.disabled = !overflowing;
    if (status) status.textContent = `${activeIndex + 1} / ${slides.length}`;
  };

  const moveTo = (index) => {
    if (!overflowing) return;
    const targetIndex = ((index % slides.length) + slides.length) % slides.length;
    const viewportRect = viewport.getBoundingClientRect();
    const slideRect = slides[targetIndex].getBoundingClientRect();
    viewport.scrollTo({
      left: viewport.scrollLeft + slideRect.left - viewportRect.left,
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
    });
    updateState(targetIndex);
  };

  const nearestSlide = () =>
    slides.reduce((nearest, slide, index) => {
      const viewportLeft = viewport.getBoundingClientRect().left;
      const currentDistance = Math.abs(slide.getBoundingClientRect().left - viewportLeft);
      const nearestDistance = Math.abs(slides[nearest].getBoundingClientRect().left - viewportLeft);
      return currentDistance < nearestDistance ? index : nearest;
    }, 0);

  const measure = () => {
    overflowing = viewport.scrollWidth - viewport.clientWidth > 2;
    carousel.classList.toggle('is-overflowing', overflowing);
    if (controls instanceof HTMLElement) controls.hidden = !overflowing;

    if (overflowing) {
      carousel.setAttribute('aria-roledescription', 'carousel');
      viewport.setAttribute('tabindex', '0');
      updateState(nearestSlide());
    } else {
      carousel.removeAttribute('aria-roledescription');
      viewport.removeAttribute('tabindex');
      viewport.scrollLeft = 0;
      updateState(0);
    }
  };

  previous?.addEventListener('click', () => moveTo(activeIndex - 1));
  next?.addEventListener('click', () => moveTo(activeIndex + 1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => moveTo(index)));

  const updatePhoto = (index) => {
    activePhotoIndex = ((index % slides.length) + slides.length) % slides.length;
    const image = slides[activePhotoIndex].querySelector('img');
    if (!(image instanceof HTMLImageElement) || !(photoImage instanceof HTMLImageElement)) return;
    photoImage.src = image.currentSrc || image.src;
    photoImage.alt = image.alt;
    if (photoCaption) photoCaption.textContent = image.alt;
    if (photoStatus) photoStatus.textContent = `${activePhotoIndex + 1} / ${slides.length}`;
  };

  const openPhoto = (index, opener) => {
    if (!(photoDialog instanceof HTMLDialogElement)) return;
    photoReturnFocus = opener;
    updatePhoto(index);
    if (typeof photoDialog.showModal === 'function') photoDialog.showModal();
    else photoDialog.setAttribute('open', '');
  };

  openers.forEach((opener, index) => {
    opener.addEventListener('click', () => openPhoto(index, opener));
  });

  photoPrevious?.addEventListener('click', () => updatePhoto(activePhotoIndex - 1));
  photoNext?.addEventListener('click', () => updatePhoto(activePhotoIndex + 1));
  photoDialog?.querySelector('[data-photo-close]')?.addEventListener('click', () => {
    if (photoDialog instanceof HTMLDialogElement) photoDialog.close();
  });
  photoDialog?.addEventListener('click', (event) => {
    if (event.target === photoDialog && photoDialog instanceof HTMLDialogElement) photoDialog.close();
  });
  photoDialog?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (photoDialog instanceof HTMLDialogElement) photoDialog.close();
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    updatePhoto(activePhotoIndex + (event.key === 'ArrowRight' ? 1 : -1));
  });
  photoDialog?.addEventListener('close', () => {
    if (photoReturnFocus instanceof HTMLElement) photoReturnFocus.focus({ preventScroll: true });
  });

  viewport.addEventListener('keydown', (event) => {
    if (!overflowing) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    moveTo(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
  });

  viewport.addEventListener(
    'scroll',
    () => {
      if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        updateState(nearestSlide());
        scrollFrame = null;
      });
    },
    { passive: true },
  );

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(viewport);
    resizeObserver.observe(viewport.firstElementChild);
  } else {
    window.addEventListener('resize', measure, { passive: true });
  }

  window.addEventListener('load', measure, { once: true });
  requestAnimationFrame(measure);
});

document.querySelectorAll('[data-path-open]').forEach((button) => {
  const dialog = document.getElementById(button.dataset.pathOpen);
  if (!(dialog instanceof HTMLDialogElement)) return;

  button.addEventListener('click', () => {
    dialog.dataset.returnFocus = button.dataset.pathOpen;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  });

  dialog.querySelector('[data-path-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => button.focus({ preventScroll: true }));
});

document.querySelectorAll('[data-chat-dialog]').forEach((dialog) => {
  const launchers = [...document.querySelectorAll('[data-chat-open]')];
  const closeButton = dialog.querySelector('[data-chat-close]');
  const clearButton = dialog.querySelector('[data-chat-clear]');
  const messages = dialog.querySelector('[data-chat-messages]');
  const suggestions = dialog.querySelector('[data-chat-suggestions]');
  const composer = dialog.querySelector('[data-chat-composer]');
  const input = dialog.querySelector('[data-chat-input]');
  const send = dialog.querySelector('[data-chat-send]');
  const status = dialog.querySelector('[data-chat-status]');
  let pending = false;
  let thinkingMessage = null;
  let returnFocus = null;
  let storage = null;
  try {
    storage = window.sessionStorage;
  } catch {
    storage = null;
  }
  const historyKey = `tirrenia-bot-history:v1:${dialog.dataset.chatLocale ?? 'it'}`;
  let history = readChatHistory(storage, historyKey);

  if (
    !(dialog instanceof HTMLDialogElement) ||
    launchers.length === 0 ||
    !(composer instanceof HTMLElement) ||
    !(input instanceof HTMLTextAreaElement) ||
    !(send instanceof HTMLButtonElement) ||
    !(messages instanceof HTMLOListElement)
  ) {
    return;
  }

  const openChat = (trigger) => {
    returnFocus = trigger instanceof HTMLElement ? trigger : null;
    if (!dialog.open) dialog.show();
    launchers.forEach((launcher) => launcher.setAttribute('aria-expanded', 'true'));
    requestAnimationFrame(() => input.focus({ preventScroll: true }));
  };

  const closeChat = () => {
    if (dialog.open) dialog.close();
  };

  const appendInlineMarkdown = (parent, segments) => {
    segments.forEach((segment) => {
      if (segment.type === 'text') {
        parent.append(document.createTextNode(segment.value));
        return;
      }

      const tagName = {
        strong: 'strong',
        emphasis: 'em',
        code: 'code',
      }[segment.type];
      if (!tagName) return;
      const element = document.createElement(tagName);
      element.textContent = segment.value;
      parent.append(element);
    });
  };

  const appendMarkdown = (parent, text) => {
    parseChatMarkdown(text).forEach((block) => {
      if (block.type === 'paragraph') {
        const paragraph = document.createElement('p');
        paragraph.className = 'bot-chat__markdown-block';
        block.lines.forEach((line, index) => {
          if (index > 0) paragraph.append(document.createElement('br'));
          appendInlineMarkdown(paragraph, line);
        });
        parent.append(paragraph);
        return;
      }

      const list = document.createElement(block.type === 'ordered-list' ? 'ol' : 'ul');
      list.className = 'bot-chat__markdown-block';
      block.items.forEach((segments) => {
        const item = document.createElement('li');
        appendInlineMarkdown(item, segments);
        list.append(item);
      });
      parent.append(list);
    });
  };

  const appendMessage = (role, text, { persist = true, variant = '', scroll = true } = {}) => {
    const item = document.createElement('li');
    item.className = `bot-chat__message bot-chat__message--${role}`;
    item.dataset.chatEntry = '';
    if (variant) item.classList.add(`bot-chat__message--${variant}`);

    if (role === 'bot') {
      const avatar = document.createElement('img');
      avatar.src = '/assets/tirrenia-bot-avatar.webp';
      avatar.alt = '';
      avatar.width = 160;
      avatar.height = 160;
      item.append(avatar);
    }

    const bubble = document.createElement('div');
    const label = document.createElement('strong');
    label.className = 'bot-chat__label';
    label.textContent =
      role === 'bot' ? dialog.dataset.chatBotLabel ?? 'Tirrenia Bot' : dialog.dataset.chatVisitorLabel ?? '';
    bubble.append(label);
    if (role === 'bot' && variant !== 'thinking') {
      appendMarkdown(bubble, text);
    } else {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      bubble.append(paragraph);
    }
    item.append(bubble);
    messages.append(item);
    if (persist) {
      history = writeChatHistory(storage, historyKey, [...history, { role, text }]);
    }
    if (scroll) messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
    return item;
  };

  history.forEach((entry) => appendMessage(entry.role, entry.text, { persist: false, scroll: false }));
  if (history.length > 0 && suggestions instanceof HTMLElement) suggestions.hidden = true;
  messages.scrollTop = messages.scrollHeight;

  const setPending = (value) => {
    pending = value;
    input.disabled = value;
    send.disabled = value;
    if (clearButton instanceof HTMLButtonElement) clearButton.disabled = value;
    dialog.toggleAttribute('data-chat-busy', value);
    messages.setAttribute('aria-busy', String(value));
    if (status) status.textContent = value ? dialog.dataset.chatThinking ?? '' : '';
    if (value && !thinkingMessage) {
      thinkingMessage = appendMessage('bot', dialog.dataset.chatThinking ?? 'Thinking…', {
        persist: false,
        variant: 'thinking',
      });
    }
    if (!value && thinkingMessage) {
      thinkingMessage.remove();
      thinkingMessage = null;
    }
  };

  launchers.forEach((launcher) => {
    launcher.addEventListener('click', () => openChat(launcher));
  });
  closeButton?.addEventListener('click', closeChat);
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeChat();
  });
  dialog.addEventListener('close', () => {
    launchers.forEach((launcher) => launcher.setAttribute('aria-expanded', 'false'));
    returnFocus?.focus({ preventScroll: true });
  });

  clearButton?.addEventListener('click', () => {
    if (pending) return;
    history = [];
    clearChatHistory(storage, historyKey);
    messages.querySelectorAll('[data-chat-entry]').forEach((entry) => entry.remove());
    if (suggestions instanceof HTMLElement) suggestions.hidden = false;
    input.focus({ preventScroll: true });
  });

  const submitMessage = async () => {
    const message = input.value.trim();
    if (!message || pending) return;

    appendMessage('visitor', message);
    input.value = '';
    if (suggestions instanceof HTMLElement) suggestions.hidden = true;
    setPending(true);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 50_000);
    try {
      const response = await fetch('/api/tirrenia-bot', {
        method: 'POST',
        credentials: 'same-origin',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, locale: dialog.dataset.chatLocale }),
      });
      const payload = await response.json();
      if (!response.ok || typeof payload.reply !== 'string' || !payload.reply.trim()) {
        throw new Error('bot_unavailable');
      }
      setPending(false);
      appendMessage('bot', payload.reply.trim());
    } catch {
      setPending(false);
      appendMessage('bot', dialog.dataset.chatError ?? 'Tirrenia Bot is temporarily unavailable.');
    } finally {
      window.clearTimeout(timeout);
      setPending(false);
      input.focus({ preventScroll: true });
    }
  };

  suggestions?.querySelectorAll('[data-chat-suggestion]').forEach((button) => {
    button.addEventListener('click', () => {
      if (pending) return;
      input.value = button.textContent?.trim() ?? '';
      void submitMessage();
    });
  });

  send.addEventListener('click', () => void submitMessage());
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    void submitMessage();
  });
});
