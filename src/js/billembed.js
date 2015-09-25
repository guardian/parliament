import {billHTML} from './bill';
import reqwest from 'reqwest'
import iframeMessenger from 'guardian/iframe-messenger'

export function init({el}) {
	var billId = /id=(\d+)/.exec(window.location.search);
	if (billId) {
		reqwest({ url: `data/bills/${billId[1]}.json`, type: 'json', contentType: 'application/json' })
			.then(bill => {
				el.innerHTML = billHTML(bill)
				iframeMessenger.resize()
			})
	} else {
		throw new Error('missing bill id in query string')
	}
}
