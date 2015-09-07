import allBills from "../../data/main.json!json"
import doT from 'olado/doT'
import mainTemplate from '../templates/index.html!text'
import billsTemplate from '../templates/bills.html!text'
import bean from 'fat/bean'
import bonzo from 'ded/bonzo'
import _ from 'lodash'
import strftime from 'samsonjs/strftime'
import config from '../json/config.json!json'

var renderMainTemplate = doT.template(mainTemplate);
var renderBillsTemplate = doT.template(billsTemplate);

function tooltipHTML(bill) {
	var stages = bill.stages.map(stage =>
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
		el.innerHTML = renderMainTemplate(config)
		this.els = {
			typeFilters: el.querySelector('.type-filters'),
			container: el.querySelector('.container'),
			tooltipContainer: el.querySelector('.tooltip-container'),
			descriptionToggle: el.querySelector('.js-toggle-descriptions'),
			typeDescriptions: el.querySelector('.type-descriptions'),
			parliamentEl: el.querySelector('.parliament'),
			sessionToggles: el.querySelector('.session-toggles')
		}
		this.initEventBindings();
		this.preprocessBills(bills);
		this.renderSession(config.sessions[0]);
		// this.renderBills(bills);
	}

	preprocessBills(bills) {
		var now = Date.now();
		bills.forEach(bill => {
			var finishedStages = bill.stages.filter(stage => stage.date && Date.parse(stage.date) < now)
			finishedStages[finishedStages.length - 1].current = true;
			var currentMajorStage = _.findLast(finishedStages, stage =>
				config.stages.indexOf(stage.name) !== -1 || stage.name === 'Royal Assent')
			if (currentMajorStage) currentMajorStage.currentMajor = true;
		})
		this.billsByName = _(bills).groupBy('name').mapValues(bills => bills[0]).value()
	}

	initEventBindings() {
		var tooltip;

		bean.on(this.els.container, 'mouseenter', '.bill', evt => {
			var bill = this.billsByName[evt.target.innerText.trim()];
			if (bill) {
				this.els.tooltipContainer.innerHTML = tooltipHTML(bill);
				tooltip = this.els.tooltipContainer.children[0];

				var {width, height} = tooltip.getBoundingClientRect();
				var offsetX = (evt.clientX / window.innerWidth) > 0.5 ? -10-width : 35;
				var offsetY = (evt.clientY / window.innerHeight) > 0.5 ? -10-height : 35;
				var {top, left} = evt.target.getBoundingClientRect();
				tooltip.style.left = (left+offsetX) + 'px';
				tooltip.style.top = (top+offsetY) + 'px';
			}
		})

		bean.on(this.els.container, 'mouseleave', '.bill', evt => {
			if (tooltip) tooltip.setAttribute('hide', '');
		})

		bean.on(this.els.typeFilters, 'change', 'input', evt => this.enactTypeFilter(evt.target))
		bean.on(this.els.typeFilters, 'mouseenter', '.type-filter', evt =>
			this.els.container.setAttribute('hovertype', evt.currentTarget.querySelector('input').name)
		);
		bean.on(this.els.typeFilters, 'mouseleave', '.type-filter', evt => this.els.container.removeAttribute('hovertype'))
		bean.on(this.els.descriptionToggle, 'click', evt => bonzo(this.els.container).toggleClass('show-type-descriptions'))

		bean.on(this.els.sessionToggles, 'change', 'input', evt => this.renderSession(evt.target.value))
	}

	renderSession(session) {
		var sessionBills = this.allBills.filter(bill => bill.session === session);
		this.renderBills(sessionBills);
	}
	renderBills(bills) {
		var typeOrder = _.zipObject( config.types.map((typeObj, index) => [typeObj.name, index] ) )
		var billsByStage = _(bills)
			.uniq(bill => bill.name)
			.sort((a,b) => typeOrder[a.type] - typeOrder[b.type])
			.groupBy(bill => bill.stages[0].house)
			.mapValues(bills =>
				_.groupBy(bills, bill => {
					var currentStage = _.findLast(bill.stages, stage => stage.currentMajor)
					var house = currentStage.house ? currentStage.house + ' ' : '';
					return `${house}${currentStage.name}`;
				})
			).value();
		console.log(billsByStage);
		this.els.parliamentEl.innerHTML = renderBillsTemplate({bills: billsByStage, stages: config.stages});

		bonzo(document.querySelectorAll('.type-filters input')).each(this.enactTypeFilter.bind(this));
	}

	enactTypeFilter(checkbox) {
		var billEls = this.els.container.querySelectorAll(`.bill[billtype="${checkbox.name}"]`);
		bonzo(billEls)[checkbox.checked ? 'addClass' : 'removeClass']('bill--visible');
	}
}

export function init(el, context) {
	var app = new App(el, allBills);
}
