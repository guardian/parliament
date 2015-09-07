// import allBills from "../../nice.json!json"
import doT from 'olado/doT'
import template from '../templates/bill.html!text'
import reqwest from 'reqwest'
// import bean from 'fat/bean'
// import bonzo from 'ded/bonzo'
// import _ from 'lodash'
// import strftime from 'samsonjs/strftime'
// import config from '../json/analysis.json!json'

var renderTemplate = doT.template(template);

class App {
	constructor(el, bill) {
		el.innerHTML = renderTemplate({bill})
	}

	initEventBindings() {
	}

	transformBills(bills) {
	}
}

export function init(el, context) {
	var billId = /id=(\d+)/.exec(window.location.search);
	if (billId) {
		reqwest({ url: `data/bills/${billId[1]}.json`, type: 'json', contentType: 'application/json' })
			.then(bill => new App(el, bill))
	} else {
		throw new Error('missing bill id in query string')
	}
}
