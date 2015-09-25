import traceurRuntime from 'traceur-runtime'
import allBills from "../../data/main.json!json"
import doT from 'olado/doT'
import toolTemplate from '../templates/tool.html!text'
import bean from 'fat/bean';
import bonzo from 'ded/bonzo';

Date.prototype.toDateInputValue = (function() {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0,10);
});

class App {
    constructor(el, bills) {
        this.iframeResize();

        var sortedBills = bills
            .sort((a,b) => {
                if (a.session === b.session) return a.name < b.name ? -1 : 1;
                else if (a.session > b.session) return -1;
                else return 1;
            });

        var baseUrl = 'https://interactive.guim.co.uk/embed/parliament/';
        var urls = {
            queenspeech: baseUrl + 'queenspeech.html',
            state: baseUrl + 'state.html',
            bill: baseUrl + 'bill.html?id=',
        }

        var container = document.createElement('div');
        container.innerHTML = doT.template(toolTemplate)({
            queenspeechUrl: urls.queenspeech,
            bills: sortedBills
        })
        el.appendChild(container);

        var els = {
            stateContainer: document.querySelector('.state'),
            billsContainer: document.querySelector('.bills'),
            queenspeechContainer: document.querySelector('.queenspeech'),

            stateEmbedLink: document.getElementById('state-embed-link'),
            statePreview: document.getElementById('state-preview'),
            billIframe: document.getElementById('bill-preview'),
            billIframeContainer: document.querySelector('.bill-preview-container'),
            billFilter: document.querySelector('input[name="bill-filter"]'),
            bills: [].slice.call(document.querySelectorAll('.bill')),
            tabsEl: document.querySelector('.tabs'),
            visibleEl: document.getElementById('state'),
            billEmbedLink: document.getElementById('bill-embed-link'),
            stateDateInput: document.querySelector('input[name="state-date"]')
        }

        bean.on(els.tabsEl, 'change', 'input', evt => {
            bonzo([els.queenspeechContainer, els.billsContainer, els.stateContainer]).hide();
            document.getElementById(evt.currentTarget.value).style.display = 'block';
        })

        bean.on(els.billsContainer, 'click', '.bill', evt => {
            var billId = evt.currentTarget.getAttribute('billid');
            let url = urls.bill + billId;
            els.billIframe.src = url;
            els.billEmbedLink.textContent = els.billEmbedLink.href = url;
            bonzo([].slice.call(els.billsContainer.querySelectorAll('.bill'))).removeClass('bill--selected');
            bonzo(evt.currentTarget).addClass('bill--selected');
            els.billIframeContainer.setAttribute('loading', '1');
        })

        els.stateDateInput.value = new Date().toDateInputValue();

        var freezeDate = _=> setStateEmbedLink(`${urls.state}?date=${els.stateDateInput.value.replace(/\//g, '-')}`);

        var setStateEmbedLink = url =>
            els.statePreview.src = els.stateEmbedLink.href = els.stateEmbedLink.textContent = url;

        setStateEmbedLink(urls.state);

        bean.on(els.stateContainer, 'change', 'input[name="state-date-type"]', evt => {
            var type = evt.currentTarget.value;
            if (type === 'autoupdate') {
                els.stateDateInput.setAttribute('disabled', true);
                setStateEmbedLink(urls.state);
            } else if (type === 'freeze') {
                els.stateDateInput.removeAttribute('disabled');
                freezeDate();
            }
        })

        bean.on(els.stateContainer, 'change', 'input[name="state-date"]', evt => freezeDate())

        bean.on(els.billFilter, 'input', evt => {
            var searchText = evt.currentTarget.value.toLowerCase();
            if (searchText.length) {
                var re = new RegExp(searchText, 'i');
                var toShow = els.bills.filter(bill => re.test(bill.textContent));
                var toHide = els.bills.filter(bill => !re.test(bill.textContent));
                bonzo(toShow).show();
                bonzo(toHide).hide();
            } else bonzo(els.bills).show();
        })
    }

    iframeResize() {
        window.addEventListener('message', function(event) {
            var iframes = [].slice.call(document.querySelectorAll('iframe'));
            var iframe = iframes.filter(iframe => iframe.contentWindow === event.source)[0];
            if (iframe) {
                var message = JSON.parse(event.data);

                switch (message.type) {
                    case 'set-height':
                        iframe.height = message.value;
                        break;
                    case 'navigate':
                        document.location.href = message.value;
                        break;
                    case 'scroll-to':
                        window.scrollTo(message.x, message.y);
                        break;
                    case 'get-location':
                        _postMessage({
                            'id':       message.id,
                            'type':     message.type,
                            'hash':     window.location.hash,
                            'host':     window.location.host,
                            'hostname': window.location.hostname,
                            'href':     window.location.href,
                            'origin':   window.location.origin,
                            'pathname': window.location.pathname,
                            'port':     window.location.port,
                            'protocol': window.location.protocol,
                            'search':   window.location.search
                        }, message.id);
                        break;
                    case 'get-position':
                        _postMessage({
                            'id':           message.id,
                            'type':         message.type,
                            'iframeTop':    iframe.getBoundingClientRect().top,
                            'innerHeight':  window.innerHeight,
                            'innerWidth':   window.innerWidth,
                            'pageYOffset':  window.pageYOffset
                        });
                        break;
                    default:
                       console.error('Received unknown action from iframe: ', message);
                }

            }
        }, false);
    }
}

export function init(el) {
    var app = new App(el, allBills);
}
