import { Client } from 'boardgame.io/client';
import { Scrapbots } from './Game';
import '../assets/css/main.css'

class ScrapbotsClient {
    constructor(rootElement) {
        this.client = Client({ game: Scrapbots });
        this.client.start();
        this.rootElement = rootElement;
        this.createBoard();
        this.attachListeners();
        this.client.subscribe(state => this.update(state));
    }

    createBoard() {
        this.rootElement.innerHTML = `
            <div class="bg">
                
            </div>`
        // create market row + market servoid/powercell stacks

        // create lanes for each player

        // create p1/p2 deck/discard
    }

    attachListeners() {
    }

    update(state) {
    }
}

const appElement = document.getElementById('app');
const app = new ScrapbotsClient(appElement);
