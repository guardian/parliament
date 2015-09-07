import allBills from "../../nice.json!json"
import doT from 'olado/doT'
import mainTemplate from '../templates/analysis.html!text'
import billsTemplate from '../templates/analysisBills.html!text'
import bean from 'fat/bean'
import bonzo from 'ded/bonzo'
import _ from 'lodash'
import strftime from 'samsonjs/strftime'
import config from '../json/analysis.json!json'

var renderMainTemplate = doT.template(mainTemplate);
var renderBillsTemplate = doT.template(billsTemplate);

function tooltipHTML(bill) {
	var stages = bill.billStages.map(stage =>
		`<li class="${stage.current ? 'stage--current' : ''}">
			<span class="tooltip__date">${stage.date ? strftime('%e %b %Y', new Date(stage.date)) : 'TBA'}</span>
			${stage.house ? stage.house.split(' ').reverse()[0] + ' ' : ''}${stage.name}
		</li>`).join('')
	var sponsors = bill.sponsors.map(sponsor =>
		`<li>${sponsor.name} ${sponsor.party ? '('+sponsor.party+')' : ''}</li>`
	).join('')
	return `
		<div class="tooltip">
			<div class="tooltip__name">${bill.name}</div>
			<div class="tooltip__type">${bill.type}</div>
			<h4>Sponsors</h4>
			<ul>${sponsors}</ul>
			<h4>Stages</h4>
			<ul>${stages}</ul>
		</div>
	`
}


class App {
	constructor(el, bills) {
		this.allBills = bills;
		this.startDate = new Date(config.sessionData[config.sessions[0]].start);
		this.endDate = new Date(config.sessions[config.sessions.length - 1].end);
		var sessions = config.sessions.map(session => {
			var {start, end} = config.sessionData[session];
			var sessionLength = new Date(end) - new Date(start);
			return {name: session, height: sessionLength / config.msToHeightRatio};
		})

		el.innerHTML = renderMainTemplate({sessions})
		this.els = {
			container: el.querySelector('.container'),
			tooltipContainer: el.querySelector('.tooltip-container'),
			billsContainer: el.querySelector('.js-bills')
		}
		this.billsByName = _(bills).groupBy('name').mapValues(bills => bills[0]).value()
		this.initEventBindings();
		this.renderBills(bills);
	}

	initEventBindings() {
		var tooltip;
		bean.on(this.els.container, 'mouseenter', '.bill', evt => {
			var bill = this.billsByName[evt.currentTarget.getAttribute('bill-name').trim()];
			if (bill) {
				this.els.tooltipContainer.innerHTML = tooltipHTML(bill);
				tooltip = this.els.tooltipContainer.children[0];

				var {width, height} = tooltip.getBoundingClientRect();
				var offsetX = (evt.clientX / window.innerWidth) > 0.5 ? -10-width : 35;
				var offsetY = (evt.clientY / window.innerHeight) > 0.5 ? -10-height : 35;
				var {top, left} = evt.currentTarget.getBoundingClientRect();
				top = top + document.body.scrollTop;
				tooltip.style.left = (left+offsetX) + 'px';
				tooltip.style.top = (top+offsetY) + 'px';
			}
		})

		bean.on(this.els.container, 'mouseleave', '.bill', evt => {
			if (tooltip) tooltip.setAttribute('hide', '');
		})
	}

	transformBills(bills) {
		var addOffsets = bill => {
			bill.billStart = new Date(bill.billStages[0].date)
			bill.billEnd = new Date(bill.billStages[bill.billStages.length - 1].date)
			bill.offset = (bill.billStart - this.startDate) / config.msToHeightRatio;
			bill.height = (bill.billEnd - bill.billStart) / config.msToHeightRatio;
			if (!bill.offset) console.log(bill, bill.billStart, this.startDate, config.msToHeightRatio);
			bill.billStages.forEach(stage =>
				stage.offset = (new Date(stage.date) - bill.billStart) / config.msToHeightRatio
			)
			return bill;
		}
		bills.forEach(addOffsets);
		bills = bills.sort((b,a) => a.height - b.height);
		bills.forEach((bill, i) => bill.column = i)

		var doubledUpColumns = [];
		bills.slice().reverse().forEach(bill => {
			var nonOverlappingbill = _.find(bills, testBill => {
				return testBill.billEnd < bill.billStart && doubledUpColumns.indexOf(testBill.column) === -1;
			})
			if (nonOverlappingbill) {
				doubledUpColumns.push(bill.column = nonOverlappingbill.column);
			}
		})

		var byCol = _.groupBy(bills, bill => bill.column);
		var cols = Object.keys(byCol);
		var numCols = _.uniq(cols).length;
		console.log(Math.max.apply(null, cols), numCols);
		for (var i = 0; i < numCols; i++) {
			byCol[cols[i]].forEach(bill => bill.column = i);
		}




		return bills;
	}

	renderBills(bills) {
		this.els.billsContainer.innerHTML = renderBillsTemplate({bills: this.transformBills(bills), stages: config.stages});
	}
}

export function init(el, context) {
	var analysisBills = _.uniq(allBills, bill => bill.name)
		.filter(bill => config.sessions.indexOf(bill.session) !== -1)
		.filter(bill => bill.billStages[bill.billStages.length-1].name === 'Royal Assent')
		.filter(bill => bill.type === "Government")

	var app = new App(el, analysisBills);
}
