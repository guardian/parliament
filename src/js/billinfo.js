import Emitter from './lib/emitter'
import bean from 'fat/bean'
import bonzo from 'ded/bonzo'
import strftime from 'samsonjs/strftime'
import _ from 'lodash'
import Hammer from 'hammer'
import bowser from 'ded/bowser'
import {billHTML} from './bill';

function find(arr, fn) {
    for (var i = 0; i < arr.length; i++) {
        if (fn(arr[i])) return arr[i];
    }
}

export class BillInfo extends Emitter {
    constructor({container, listenerEl, bills}) {
        super();
        this.listenerEl = listenerEl;
        this.tooltipContainer = container;
        this.initEventHandlers();

        this.billsById = _(bills).groupBy('id').mapValues(bills => bills[0]).value()
    }

    showBillInfo(billEl, peak=false) {
        if (!this.visibleBill || this.visibleBill.billEl !== billEl || this.visibleBill.peak !== peak) {
            var bill = this.billsById[billEl.getAttribute('billid')];
            if (bill) {
                this.visibleBill = {billEl, peak};
                this.tooltipContainer.innerHTML = this.getHTML(bill);
                this.tooltip = this.tooltipContainer.children[0];
                bonzo(this.tooltip)[peak ? 'addClass' : 'removeClass']('bill-info--peak')

                let {top:containerTop, left:containerLeft, height:containerHeight} = bonzo(this.tooltipContainer).offset();
                let {top, left} = bonzo(billEl).offset();
                let {width, height} = this.tooltip.getBoundingClientRect();

                if (peak) {
                    let scrollTop = bonzo(document.body).scrollTop();
                    let offsetY = ((top - scrollTop) / window.innerHeight) > 0.5 ? -10-height : 35;
                    this.tooltip.style.top = (top - containerTop + offsetY) + 'px';
                    this.emit('peak');
                } else {
                    let maxY = containerHeight - height;
                    let offsetY = Math.max(40, Math.min(maxY, top - containerTop - (height / 2)));
                    let offsetX = Math.max(0, left - containerLeft - (width / 2));
                    this.tooltip.style.top = offsetY + 'px';
                    this.tooltip.style.left = offsetX + 'px';
                    this.emit('show');
                }
            }
        }
    }

    hideBillInfo() {
        if (this.visibleBill) {
            this.emit(this.visibleBill.peak ? 'unpeak' : 'hide');
            this.visibleBill = undefined;
            if (this.tooltip) this.tooltip.setAttribute('hide', '');
        }
    }

    static getBillEl(element) {
        while (element) {
            if (bonzo(element).hasClass('bill')) return element;
            element = element.parentElement;
        }
    }

    initMobileEventHandlers() {
        var hammer = new Hammer.Manager(this.listenerEl, {
            recognizers: [
                [Hammer.Press, {time: 200}],
            ]
        });
        hammer.on('press', ev => this.enableTouchInspectMode());

        this.touchMoveHandler = evt => {
            var touch = evt.touches[0];
            var el = document.elementFromPoint(touch.clientX, touch.clientY);
            var bill = BillInfo.getBillEl(el);
            if (bill) this.showBillInfo(bill, true);
            else this.hideBillInfo();
            evt.preventDefault();
        }

        this.touchEndHandler = evt => {
            this.hideBillInfo();
            this.disableTouchInspectMode();
        }
    }

    initDesktopEventHandlers() {
        bean.on(this.listenerEl, 'mouseenter', '[billid]', evt => {
            if (!this.visibleBill || this.visibleBill.peak) this.showBillInfo(evt.currentTarget, true);
        })
        bean.on(this.listenerEl, 'mouseleave', '[billid]', evt => {
            if (this.visibleBill && this.visibleBill.peak) this.hideBillInfo();
        });
    }

    initEventHandlers() {
        if (bowser.mobile) this.initMobileEventHandlers();
        else this.initDesktopEventHandlers();

        bean.on(this.listenerEl, 'click', '[billid]', evt => this.showBillInfo(evt.currentTarget))
        bean.on(this.tooltipContainer, 'click', '.bill-info__close', evt => this.hideBillInfo())
    }

    setTouchInspectMode(val) {
        bean[val](this.listenerEl, 'touchmove', this.touchMoveHandler)
        bean[val](this.listenerEl, 'touchend', this.touchEndHandler)
    }
    enableTouchInspectMode() { this.setTouchInspectMode('on'); }
    disableTouchInspectMode() { this.setTouchInspectMode('off'); }

    getHTML(bill) {
        return billHTML(bill);
    }
}
