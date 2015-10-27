import doT from 'olado/doT'
import template from '../templates/divisions.html!text'
import strftime from 'samsonjs/strftime'
import reqwest from 'reqwest'
import iframeMessenger from 'guardian/iframe-messenger'
import bean from 'fat/bean'
import bonzo from 'ded/bonzo'

var renderTemplate = doT.template(template);

function groupBy(arr, fn) {
    var obj = {};
    for (var i = 0; i < arr.length; i++) {
        obj[fn(arr[i])] = arr[i];
    }
    return obj;
}

export function init({el}) {
    reqwest({ url: `data/divisions.json`, type: 'json', contentType: 'application/json' })
        .then(divisions => {
            var sortedDivisions = divisions
                .sort((a, b) => a.date > b.date ? -1 : b.date > a.date ? 1 : 0)

            var niceDate = date => strftime('%a, %b %e %Y', new Date(date));
            var niceTime = date => strftime('%H:%M', new Date(date));

            var lastDate;
            for (var i = 0; i < sortedDivisions.length; i++) {
                let div = sortedDivisions[i]
                let thisDate = niceDate(div.date);
                div.formattedDate = lastDate === thisDate ? '' : thisDate;
                div.time = niceTime(div.date);
                lastDate = thisDate;
            }
            el.innerHTML = renderTemplate({
                divisions: sortedDivisions
            });

            var els = {
                divisions: el.querySelector('.divisions'),
                popup: el.querySelector('.popup'),
                popupContent: el.querySelector('.popup__content'),
                popupUrl: el.querySelector('.popup__url'),
                popupTitle: el.querySelector('.popup__title'),
                popupDesc: el.querySelector('.popup__desc'),
                popupRefresh: el.querySelector('.popup__refreshtimer'),
                iframeContainer: el.querySelector('.popup__iframe-container'),
            }

            var baseEmbedUrl;
            var setEmbedUrl = url => {
                els.popupUrl.value = url;
                els.iframeContainer.innerHTML = `<iframe src=${url}></iframe>`;
            }

            bean.on(els.divisions, 'click', '.division__link', evt => {
                baseEmbedUrl = evt.currentTarget.href;
                setEmbedUrl(evt.currentTarget.href);
                els.popupTitle.value = '';
                els.popupDesc.value = '';
                els.popupTitle.placeholder = evt.currentTarget.querySelector('.division__title').innerHTML;
                bonzo(els.divisions).addClass('divisions--popup');
                evt.preventDefault();
            })


            bean.on(els.popup, 'click', evt => {
                if (evt.target.className === 'popup') {
                    bonzo(els.divisions).removeClass('divisions--popup');
                }
            })


            var generateUrl = () => {
                let title = els.popupTitle.value ? `&title=${encodeURIComponent(els.popupTitle.value)}` : '';
                let desc = els.popupDesc.value ? `&desc=${encodeURIComponent(els.popupDesc.value)}` : '';
                return `${baseEmbedUrl}${title}${desc}`;
            }

            var timeout;
            var delayedUpdate = () => {
                window.clearTimeout(timeout);
                timeout = window.setTimeout(() => setEmbedUrl(generateUrl()), 2000)
                bonzo(els.popupRefresh).removeClass('popup__refreshtimer--refreshing');
                window.setTimeout(() => bonzo(els.popupRefresh).addClass('popup__refreshtimer--refreshing'), 10);
            }

            bean.on(els.popupTitle, 'input', evt => delayedUpdate())
            bean.on(els.popupDesc, 'input', evt => delayedUpdate())


            window.addEventListener('message', evt => {
                var iframe = el.querySelector('.popup iframe');
                if (iframe && evt.source === iframe.contentWindow) {
                    var message = JSON.parse(event.data);
                    if (message.type === 'set-height') {
                        iframe.style.height = `${message.value}px`;
                        els.popupContent.style.height = `${message.value + 170}px`;
                    }
                }
            });

            iframeMessenger.resize()
        })
}
