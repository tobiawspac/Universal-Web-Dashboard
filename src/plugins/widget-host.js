// Widget Host — creates sandboxed iframes for plugin widgets
// Included in widgets.html and device_page.html

const WidgetHost = (() => {
  const widgets = new Map();

  function createWidgetFrame(pluginId, container, deviceId, config) {
    const frameId = `widget-${pluginId}-${Date.now()}`;
    const iframe = document.createElement('iframe');
    iframe.id = frameId;
    iframe.sandbox = 'allow-scripts';
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.minHeight = '100px';
    iframe.src = `/api/plugins/${pluginId}/widget.js`;

    container.appendChild(iframe);

    const state = {
      id: frameId,
      pluginId,
      deviceId,
      config,
      iframe,
      ready: false,
      data: null,
    };
    widgets.set(frameId, state);

    // Listen for messages from the iframe
    const handler = async (event) => {
      if (event.source !== iframe.contentWindow) return;
      const msg = event.data;
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'widget:ready':
          state.ready = true;
          // Send current data
          if (state.data) {
            iframe.contentWindow.postMessage({ type: 'widget:data', payload: state.data }, '*');
          }
          break;
        case 'widget:requestData':
          // Fetch fresh data and send
          const data = await fetchData(pluginId, deviceId, config);
          iframe.contentWindow.postMessage({ type: 'widget:data', payload: data }, '*');
          break;
        case 'widget:resize':
          if (msg.height) iframe.style.height = msg.height + 'px';
          break;
      }
    };
    window.addEventListener('message', handler);

    // Initial data fetch
    fetchData(pluginId, deviceId, config).then((data) => {
      state.data = data;
      if (state.ready && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'widget:data', payload: data }, '*');
      }
    });

    // Timeout for widget:ready
    setTimeout(() => {
      if (!state.ready) {
        container.innerHTML = '<div style="padding:20px;color:var(--ink-dim);font-size:12px;">Widget failed to load</div>';
      }
    }, 5000);

    return { frameId, destroy: () => destroyWidget(frameId) };
  }

  async function fetchData(pluginId, deviceId, config) {
    try {
      if (deviceId) {
        const res = await fetch(`/api/snmp/${deviceId}/interfaces`, { credentials: 'include' });
        if (res.ok) return await res.json();
      }
      // Fallback: basic device data
      const res = await fetch('/api/dashboard-summary', { credentials: 'include' });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  }

  function destroyWidget(frameId) {
    const state = widgets.get(frameId);
    if (state) {
      state.iframe.remove();
      widgets.delete(frameId);
    }
  }

  return { createWidgetFrame };
})();
