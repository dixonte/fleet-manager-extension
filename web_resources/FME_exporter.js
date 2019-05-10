$(function () {
    'use strict';
    const fleetManagerBaseUrl = 'https://fleet.fallkrom.space';

    function createExporterBlock() {
        const exporterBlockHtml = `
            <div id="FME-exporter-block" style="margin-top:20px;">
                <a class="shadow-button trans-02s trans-color" id="FME-exporter-submit">
                    <span class="label js-label trans-02s">Export to Fleet Manager</span>
                    <span class="icon trans-02s"></span>
                    <span class="left-section"></span>
                    <span class="right-section"></span>
                </a>
                <p id="FME-exporter-msg" style="
                    color: #6c84a2;
                    font-size: 12px;
                    text-transform: uppercase;
                    font-family: 'Electrolize', sans-serif;
                    display: inline-block;
                    padding-left: 4px;
                "></p>
            </div>
        `;
        $('.sidenav').append(exporterBlockHtml);
    }

    const _manufacturerShortMap = {
        'ANVL': 'Anvil',
        'AEGS': 'Aegis',
        'AOPOA': 'Aopoa',
        'ARGO': 'Argo',
        'BANU': 'Banu',
        'CNOU': 'Consolidated',
        'CRSD': 'Crusader',
        'DRAK': 'Drake',
        'ESPERIA': 'Esperia',
        'KRGR': 'Kruger',
        'MISC': 'MISC',
        'ORIG': 'Origin',
        'RSI': 'RSI',
        'TMBL': 'Tumbril',
        'VANDUUL': 'Vanduul',
        'XIAN': 'Xi\'an',
    };

    let pledges = [];
    $('.list-items li').each((index, el) => {
        const $pledge = $(el);

        const $shipInfo = $pledge.find('.kind:contains(Ship)').parent();
        if ($shipInfo.length === 0) {
            return;
        }

        const pledge = {
            id: $('.js-pledge-id', $pledge).val(),
            name: $('.title', $shipInfo).text(),
            cost: $('.js-pledge-value', $pledge).val(),
            lti: $('.title:contains(Lifetime Insurance)', $pledge).length > 0,
            manufacturer: $('.liner span', $shipInfo).text(),
            pledge: $('.js-pledge-name', $pledge).val(),
            pledge_date: $('.date-col:first', $pledge).text().replace(/created:\s+/gi, '').trim(),
        };
        pledge.name = pledge.name.replace(/^\s*(?:Aegis|Anvil|Banu|Drake|Esperia|Kruger|MISC|Origin|RSI|Tumbril|Vanduul|Xi'an)[^a-z0-9]+/gi, '');
        pledge.name = pledge.name.replace(/^\s*(?:Aegis|Anvil|Banu|Drake|Esperia|Kruger|MISC|Origin|RSI|Tumbril|Vanduul|Xi'an)[^a-z0-9]+/gi, '');
        pledge.manufacturer = _manufacturerShortMap[pledge.manufacturer] || pledge.manufacturer;
        pledge.warbond = pledge.name.toLowerCase().indexOf('warbond') > -1;

        pledges.push(pledge);
    });
    createExporterBlock();

    async function retrieveApiToken() {
        const resp = await fetch(fleetManagerBaseUrl + '/api/me', {
            credentials: 'include'
        });
        if (!resp.ok) {
            console.error(`Unable to request ${resp.url}.`);
            return null;
        }
        if (resp.redirected && resp.url === fleetManagerBaseUrl + '/login/') {
            $('#FME-exporter-msg').html(`We can't upload your fleet. Please login first at <a href="${fleetManagerBaseUrl}" target="_blank">${fleetManagerBaseUrl}</a>.`);
            return null;
        }
        const json = await resp.json();

        return json.apiToken;
    }

    $('#FME-exporter-submit').on('click', async (ev) => {
        $('#FME-exporter-msg').html('');

        let apiToken = window.localStorage.getItem('apiToken');
        if (!apiToken) {
            apiToken = await retrieveApiToken();
            window.localStorage.setItem('apiToken', apiToken);
        }
        if (!apiToken) {
            return;
        }

        $('#FME-exporter-msg').html(`Uploading...`);
        const resp = await fetch(fleetManagerBaseUrl + '/api/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiToken
            },
            body: JSON.stringify(pledges)
        });
        if (resp.ok) {
            $('#FME-exporter-msg').html(`<span style="color: #0f0;">Success!</span> <a target="_blank" href="${fleetManagerBaseUrl}/#/my-fleet">Go to your fleet</a>.`);
            return;
        }
        if (resp.status === 400) {
            const json = await resp.json();
            console.error(`An error has occurred. Error: ${json.error}.`);

            let errorHtml = '';
            switch (json.error) {
                case 'no_citizen_created':
                    errorHtml = `Your RSI account must be linked first. Go to the <a target="_blank" href="${fleetManagerBaseUrl}/#/profile">profile page</a>.`;
                    break;
                case 'uploaded_too_close':
                    errorHtml = `Your fleet has been uploaded recently. Please wait before re-uploading.`;
                    break;
                case 'not_found_handle':
                    errorHtml = `The SC handle ${json.context.handle} does not exist. Please check the typo.`;
                    break;
                case 'bad_citizen':
                    errorHtml = `Your SC handle has probably changed. Please update it in <a target="_blank" href="${fleetManagerBaseUrl}/#/profile">your Profile</a>.`;
                    break;
                case 'invalid_fleet_data':
                case 'bad_json':
                case 'cannot_handle_file':
                    errorHtml = `An error has occurred, please retry. If this error persists, you can <a href="https://github.com/Ioni14/fleet-manager-extension/issues">post an issue on the repo</a> to help us to resolve it.`;
                    break;
            }
            $('#FME-exporter-msg').html(errorHtml);
        } else if (resp.status === 403) {
            window.localStorage.removeItem('apiToken');
            $('#FME-exporter-msg').html(`We can't upload your fleet. Please login first at <a href="${fleetManagerBaseUrl}" target="_blank">${fleetManagerBaseUrl}</a>.`);
        } else {
            $('#FME-exporter-msg').html(`An error has occurred, please retry. If this error persists, you can <a href="https://github.com/Ioni14/fleet-manager-extension/issues">post an issue on the repo</a> to help us to resolve it.`);
        }
    });
});
