// ==================== WIZARD — ASSISTANT DE CONFIGURATION ====================

let _wizardStep = 'choose';
let _wizardAdded = { machines: 0, endpoints: 0 };

function openWizard() {
    _wizardStep = 'choose';
    _wizardAdded = { machines: 0, endpoints: 0 };
    _renderWizardStep();
    openModal('modalWizard');
}

function wizardBack() {
    if (_wizardStep === 'summary') {
        _wizardStep = 'choose';
    } else {
        _wizardStep = 'choose';
    }
    _renderWizardStep();
}

function _renderWizardStep() {
    const body = document.getElementById('wizardBody');
    const back = document.getElementById('wizardBtnBack');
    const title = document.getElementById('wizardTitle');

    back.style.display = _wizardStep === 'choose' ? 'none' : '';

    if (_wizardStep === 'choose') {
        title.textContent = '🧙 Assistant de configuration';
        body.innerHTML = `
            <p class="hint">Que souhaitez-vous configurer ?</p>
            <div class="wizard-choices">
                <button class="wizard-choice" onclick="_wizardGoTo('machine')">
                    <span class="wizard-choice-icon">🖥️</span>
                    <span class="wizard-choice-title">Machines</span>
                    <span class="wizard-choice-desc">Ajouter des VMs, containers, stacks</span>
                    <span class="wizard-choice-count">${state.infra.length} existante${state.infra.length > 1 ? 's' : ''}</span>
                </button>
                <button class="wizard-choice" onclick="_wizardGoTo('endpoint')">
                    <span class="wizard-choice-icon">🔌</span>
                    <span class="wizard-choice-title">Endpoints API</span>
                    <span class="wizard-choice-desc">GitLab, GitHub, Prometheus, Consul...</span>
                    <span class="wizard-choice-count">${getApiEndpointCount()} existant${getApiEndpointCount() > 1 ? 's' : ''}</span>
                </button>
                <button class="wizard-choice" onclick="_wizardGoTo('import')">
                    <span class="wizard-choice-icon">📡</span>
                    <span class="wizard-choice-title">Import en masse</span>
                    <span class="wizard-choice-desc">Depuis Prometheus, Zabbix ou JSON</span>
                    <span class="wizard-choice-count">Sources externes</span>
                </button>
            </div>
        `;
    } else if (_wizardStep === 'machine') {
        title.textContent = '🖥️ Ajouter des machines';
        body.innerHTML = `
            <p class="hint">Ajoutez une ou plusieurs machines. Mode rapide : une machine par ligne.</p>
            <div class="wizard-toggle">
                <button class="btn btn-small btn-secondary wizard-mode-btn active" onclick="_wizardMachineMode('single')" id="wizMachineSingle">Formulaire</button>
                <button class="btn btn-small btn-secondary wizard-mode-btn" onclick="_wizardMachineMode('batch')" id="wizMachineBatch">Mode batch</button>
            </div>
            <div id="wizardMachineContent">
                ${_wizardMachineSingleForm()}
            </div>
            <div id="wizardMachineAdded" class="wizard-added-list"></div>
        `;
    } else if (_wizardStep === 'endpoint') {
        title.textContent = '🔌 Ajouter un endpoint API';
        body.innerHTML = `
            <p class="hint">Configurez un endpoint — il sera automatiquement ajouté au dashboard.</p>
            <div class="api-form" style="border:none;padding:0;background:none">
                <div class="api-form-grid">
                    <div class="api-form-field">
                        <label for="wizEpType">Type de service</label>
                        <select id="wizEpType" onchange="_wizardEpTypeChange()">
                            <option value="gitlab">🦊 GitLab</option>
                            <option value="github">🐙 GitHub</option>
                            <option value="consul">🟢 Consul</option>
                            <option value="ansible">🤖 Ansible</option>
                            <option value="openstack">☁️ OpenStack</option>
                            <option value="prometheus">📊 Prometheus</option>
                            <option value="grafana">📈 Grafana</option>
                            <option value="loki">📋 Loki</option>
                            <option value="vault">🔐 Vault</option>
                            <option value="tempo">🔍 Tempo</option>
                        </select>
                    </div>
                    <div class="api-form-field">
                        <label for="wizEpEnv">Environnement <span class="api-form-optional">optionnel</span></label>
                        <select id="wizEpEnv">
                            <option value="">— Transverse</option>
                            <option value="dev">DEV</option>
                            <option value="preprod">PREPROD</option>
                            <option value="prod">PROD</option>
                        </select>
                    </div>
                    <div class="api-form-field api-form-field-full">
                        <label for="wizEpName">Nom</label>
                        <input type="text" id="wizEpName" placeholder="Ex : Mon projet GitLab">
                    </div>
                    <div class="api-form-field api-form-field-full">
                        <label for="wizEpUrl">URL de l'API</label>
                        <input type="text" id="wizEpUrl" placeholder="https://gitlab.example.com">
                    </div>
                    <div class="api-form-field api-form-field-full">
                        <label for="wizEpToken">Token d'acces <span class="api-form-optional">optionnel</span></label>
                        <input type="password" id="wizEpToken" placeholder="glpat-xxxx ou ghp_xxxx" autocomplete="off">
                    </div>
                    <div id="wizEpFieldsExtra" class="api-fields-extra">
                        <div class="api-form-field">
                            <label for="wizEpProjectId">Project ID</label>
                            <input type="text" id="wizEpProjectId" placeholder="12345">
                        </div>
                        <div class="api-form-field">
                            <label for="wizEpBranch">Branche</label>
                            <input type="text" id="wizEpBranch" placeholder="main">
                        </div>
                    </div>
                </div>
                <div class="api-form-actions">
                    <button class="btn btn-primary" onclick="_wizardAddEndpoint()">+ Ajouter l'endpoint</button>
                </div>
            </div>
            <div id="wizardEpAdded" class="wizard-added-list"></div>
        `;
        _wizardEpTypeChange();
    } else if (_wizardStep === 'import') {
        title.textContent = '📡 Import en masse';
        body.innerHTML = `
            <p class="hint">Importez vos machines depuis une source de monitoring externe.</p>
            <div class="wizard-import-steps">
                <div class="wizard-import-step">
                    <span class="wizard-import-step-num">1</span>
                    <span>Choisissez le format source</span>
                </div>
                <div class="wizard-import-step">
                    <span class="wizard-import-step-num">2</span>
                    <span>Collez le JSON ou fetchez l'URL</span>
                </div>
                <div class="wizard-import-step">
                    <span class="wizard-import-step-num">3</span>
                    <span>Previsualisez puis importez</span>
                </div>
            </div>
            <button class="btn btn-primary" onclick="closeModal('modalWizard');openImportSourcesModal()">Ouvrir l'import depuis sources</button>
        `;
    } else if (_wizardStep === 'summary') {
        title.textContent = '✅ Configuration terminee';
        body.innerHTML = `
            <div class="wizard-summary">
                ${_wizardAdded.machines > 0 ? `<div class="wizard-summary-item"><span class="wizard-summary-icon">🖥️</span><strong>${_wizardAdded.machines}</strong> machine${_wizardAdded.machines > 1 ? 's' : ''} ajoutee${_wizardAdded.machines > 1 ? 's' : ''}</div>` : ''}
                ${_wizardAdded.endpoints > 0 ? `<div class="wizard-summary-item"><span class="wizard-summary-icon">🔌</span><strong>${_wizardAdded.endpoints}</strong> endpoint${_wizardAdded.endpoints > 1 ? 's' : ''} ajouté${_wizardAdded.endpoints > 1 ? 's' : ''}</div>` : ''}
                ${_wizardAdded.machines === 0 && _wizardAdded.endpoints === 0 ? '<p class="hint">Aucun element ajouté.</p>' : ''}
            </div>
            <p class="hint" style="margin-top:12px">Vous pouvez continuer a ajouter des elements ou fermer l'assistant.</p>
        `;
    }
}

function _wizardGoTo(step) {
    _wizardStep = step;
    _renderWizardStep();
}

// ---- Machine : single form ----
function _wizardMachineSingleForm() {
    return `
        <div class="api-form-grid" style="margin-top:10px">
            <div class="api-form-field">
                <label for="wizMachName">Nom</label>
                <input type="text" id="wizMachName" placeholder="prod-web-01">
            </div>
            <div class="api-form-field">
                <label for="wizMachEnv">Environnement</label>
                <select id="wizMachEnv">
                    <option value="prod">PROD</option>
                    <option value="preprod">PREPROD</option>
                    <option value="dev">DEV</option>
                </select>
            </div>
            <div class="api-form-field">
                <label for="wizMachType">Type</label>
                <select id="wizMachType">
                    <option value="vm">VM</option>
                    <option value="lxc">LXC</option>
                    <option value="stack">Stack</option>
                    <option value="logger">Logger</option>
                    <option value="other">Autre</option>
                </select>
            </div>
            <div class="api-form-field">
                <label for="wizMachStatus">Statut</label>
                <select id="wizMachStatus">
                    <option value="up">🟢 Up</option>
                    <option value="degraded">🟡 Degraded</option>
                    <option value="down">🔴 Down</option>
                </select>
            </div>
            <div class="api-form-field">
                <label for="wizMachIp">Adresse IP <span class="api-form-optional">optionnel</span></label>
                <input type="text" id="wizMachIp" placeholder="10.0.1.10">
            </div>
            <div class="api-form-field">
                <label for="wizMachDetails">Details <span class="api-form-optional">optionnel</span></label>
                <input type="text" id="wizMachDetails" placeholder="nginx, node 18, pm2">
            </div>
        </div>
        <div class="api-form-actions" style="margin-top:12px">
            <button class="btn btn-primary" onclick="_wizardAddMachine()">+ Ajouter la machine</button>
        </div>
    `;
}

function _wizardMachineBatchForm() {
    return `
        <div style="margin-top:10px">
            <div class="api-form-field" style="margin-bottom:8px">
                <label>Environnement par defaut</label>
                <select id="wizBatchEnv" style="max-width:160px">
                    <option value="prod">PROD</option>
                    <option value="preprod">PREPROD</option>
                    <option value="dev">DEV</option>
                </select>
            </div>
            <label>Une machine par ligne — format : <code>nom  type  statut  ip  details</code></label>
            <textarea id="wizBatchText" rows="6" placeholder="prod-web-01  vm  up  10.0.1.10  nginx 1.24
prod-web-02  vm  up  10.0.1.11  nginx 1.24
prod-db-01  lxc  up  10.0.2.10  PostgreSQL 15
prod-cache  lxc  degraded  10.0.2.20  Redis 7.2 — lag"></textarea>
            <div class="api-form-actions" style="margin-top:10px">
                <button class="btn btn-primary" onclick="_wizardAddBatch()">+ Importer les machines</button>
            </div>
        </div>
    `;
}

function _wizardMachineMode(mode) {
    const content = document.getElementById('wizardMachineContent');
    document.getElementById('wizMachineSingle').classList.toggle('active', mode === 'single');
    document.getElementById('wizMachineBatch').classList.toggle('active', mode === 'batch');
    content.innerHTML = mode === 'single' ? _wizardMachineSingleForm() : _wizardMachineBatchForm();
}

function _wizardAddMachine() {
    const name = document.getElementById('wizMachName').value.trim();
    if (!name) return toast('⚠️ Nom requis');
    const env = document.getElementById('wizMachEnv').value;
    const type = document.getElementById('wizMachType').value;
    const status = document.getElementById('wizMachStatus').value;
    const ip = document.getElementById('wizMachIp').value.trim();
    const details = document.getElementById('wizMachDetails').value.trim();

    state.infra.push({ id: uid(), name, type, status, ip, details, env, added: new Date().toISOString() });
    saveState();
    _wizardAdded.machines++;
    addLog('🖥️', `Machine ${name} ajoutée via assistant`);

    // Feedback
    const list = document.getElementById('wizardMachineAdded');
    list.innerHTML += `<div class="wizard-added-item">✓ ${esc(name)} <span class="wizard-added-meta">${type.toUpperCase()} · ${env.toUpperCase()} · ${status}</span></div>`;

    // Reset form
    document.getElementById('wizMachName').value = '';
    document.getElementById('wizMachIp').value = '';
    document.getElementById('wizMachDetails').value = '';
    document.getElementById('wizMachName').focus();

    renderAll();
    toast(`✅ Machine ${name} ajoutée`);
}

function _wizardAddBatch() {
    const text = document.getElementById('wizBatchText').value.trim();
    if (!text) return toast('⚠️ Aucune donnée');
    const env = document.getElementById('wizBatchEnv').value;
    const lines = text.split('\n').filter(l => l.trim());
    let count = 0;
    const list = document.getElementById('wizardMachineAdded');

    for (const line of lines) {
        const parts = line.trim().split(/\s{2,}|\t/);
        const name = parts[0];
        if (!name) continue;
        const type = normalizeType(parts[1] || 'vm');
        const status = normalizeStatus(parts[2] || 'up');
        const ip = parts[3] || '';
        const details = parts[4] || '';

        state.infra.push({ id: uid(), name, type, status, ip, details, env, added: new Date().toISOString() });
        list.innerHTML += `<div class="wizard-added-item">✓ ${esc(name)} <span class="wizard-added-meta">${type.toUpperCase()} · ${env.toUpperCase()}</span></div>`;
        count++;
    }

    _wizardAdded.machines += count;
    saveState();
    addLog('🖥️', `${count} machine(s) ajoutée(s) via assistant (batch)`);
    document.getElementById('wizBatchText').value = '';
    renderAll();
    toast(`✅ ${count} machine(s) ajoutée(s)`);
}

// ---- Endpoint ----
function _wizardEpTypeChange() {
    const type = document.getElementById('wizEpType').value;
    const extra = document.getElementById('wizEpFieldsExtra');
    const projId = document.getElementById('wizEpProjectId');
    const branch = document.getElementById('wizEpBranch');
    const projField = projId.closest('.api-form-field');
    const branchField = branch.closest('.api-form-field');

    if (type === 'gitlab') {
        extra.style.display = '';
        projField.style.display = '';
        branchField.style.display = '';
        projId.placeholder = 'Project ID (ex: 12345)';
        branch.placeholder = 'Branche (defaut: main)';
    } else if (type === 'github') {
        extra.style.display = '';
        projField.style.display = '';
        branchField.style.display = '';
        projId.placeholder = 'owner/repo (ex: org/myrepo)';
        branch.placeholder = 'Branche (defaut: main)';
    } else if (type === 'openstack') {
        extra.style.display = '';
        projField.style.display = '';
        branchField.style.display = 'none';
        projId.placeholder = 'Projet / Tenant';
    } else if (type === 'grafana') {
        extra.style.display = '';
        projField.style.display = '';
        branchField.style.display = 'none';
        projId.placeholder = 'Org ID (optionnel)';
    } else if (type === 'vault') {
        extra.style.display = '';
        projField.style.display = '';
        branchField.style.display = 'none';
        projId.placeholder = 'Namespace (optionnel)';
    } else {
        extra.style.display = 'none';
    }
}

function _wizardAddEndpoint() {
    // Remplir le form principal et deleguer a addApiEndpoint
    const type = document.getElementById('wizEpType').value;
    const env = document.getElementById('wizEpEnv').value;
    const name = document.getElementById('wizEpName').value.trim();
    const url = document.getElementById('wizEpUrl').value.trim();
    const token = document.getElementById('wizEpToken').value.trim();

    if (!name || !url) return toast('⚠️ Nom et URL requis');

    // Copier vers le form principal
    document.getElementById('apiType').value = type;
    onApiTypeChange();
    document.getElementById('apiEnv').value = env;
    document.getElementById('apiName').value = name;
    document.getElementById('apiUrl').value = url;
    document.getElementById('apiToken').value = token;

    // Champs extras
    const projId = document.getElementById('wizEpProjectId');
    const branch = document.getElementById('wizEpBranch');
    if (projId) document.getElementById('apiProjectId').value = projId.value;
    if (branch) document.getElementById('apiBranch').value = branch.value;

    // Deleguer l'ajout
    addApiEndpoint();
    _wizardAdded.endpoints++;

    // Feedback dans le wizard
    const list = document.getElementById('wizardEpAdded');
    const t = API_TYPES[type] || { icon: '🔌', label: type };
    list.innerHTML += `<div class="wizard-added-item">✓ ${t.icon} ${esc(name)} <span class="wizard-added-meta">${t.label}${env ? ' · ' + env.toUpperCase() : ''}</span></div>`;

    // Reset wizard form
    document.getElementById('wizEpName').value = '';
    document.getElementById('wizEpUrl').value = '';
    document.getElementById('wizEpToken').value = '';
    if (projId) projId.value = '';
    if (branch) branch.value = '';
    document.getElementById('wizEpName').focus();
}
