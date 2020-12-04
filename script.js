moment.locale('pt-br');

class QueueNode{
	constructor(value){
		this._value = value;
		this._next = null;
	}

	set next(value){
		this._next = value;
	}

	get next(){
		return this._next;
	}

	get value(){
		return this._value;
	}
}

class Queue{
	constructor(value){
		this._size = 0;

		if (value === undefined){
			this._first = null;
			this._last = null;
		}else{
			this.push(value);
		}
	}

	get size(){
		return this._size;
	}

	get empty(){
		return this.size === 0;
	}

	push(value){
		let newNode = new QueueNode(value);
		if (this.empty){
			this._first = newNode;
		}else{
			this._last.next = newNode;
		}
		this._last = newNode;
		this._size++;
	}

	pop(){
		let itemToRemove = this._first;
		this._first = itemToRemove.next;
		this._size--;
		return itemToRemove.value;
	}

	top(){
		return this._first.value;
	}
}

const url = 'https://pt.wikipedia.org/w/api.php';

async function checkIfExists(title){
	let result = true;
	const params = {
		action: 'query',
		format: 'json',
		titles: encodeURIComponent(title.trim()),
		prop: 'revisions'
	};
	let urlQuery = url + '?origin=*';
	Object.keys(params).forEach(function(key){urlQuery += '&' + key + '=' + params[key];});
	await fetch(urlQuery)
		.then(function(response){
			return response.json();
		})
		.then(function(response) {
			const pages = response.query.pages;
			if (pages){
				for (let p in pages){
					if (p == -1){
						result = false;
					}
				}
			}else{
				result = false;
			}
		})
		.catch(function(error){
			console.log(error);
			result = false;
		});
	return result;
}

async function getLinksFrom(title){
	let list = [];
	const params = {
		action: 'query',
		format: 'json',
		titles: encodeURIComponent(title.trim()),
		prop: 'links',
		pllimit: 'max'
	};
	let urlQuery = url + '?origin=*';
	Object.keys(params).forEach(function(key){urlQuery += '&' + key + '=' + params[key];});
	await fetch(urlQuery)
		.then(function(response){
			return response.json();
		})
		.then(function(response) {
			for (let p in response.query.pages){
				list = response.query.pages[p].links.map((item) => item.title);
			}
		})
		.catch(function(error){
			console.log(error);
			return undefined;
		});
	return list;
}

async function getLinksTo(title){
	let list = [];
	const params = {
		action: 'query',
		format: 'json',
		titles: encodeURIComponent(title.trim()),
		prop: 'linkshere',
		lhlimit: 'max'
	};
	let urlQuery = url + '?origin=*';
	Object.keys(params).forEach(function(key){urlQuery += '&' + key + '=' + params[key];});
	await fetch(urlQuery)
		.then(function(response){
			return response.json();
		})
		.then(function(response) {
			for (let p in response.query.pages){
				list = response.query.pages[p].linkshere.map((item) => item.title);
			}
		})
		.catch(function(error){
			console.log(error);
			return undefined;
		});
	return list;
}

function isMetaArticle(title){
	const re = /(.*:.*)/;
	return re.exec(title);
}

function isADate(title){
	const check = moment(title, 'DD de MMMM', true).parsingFlags();
	if (!check.invalidEra && !check.invalidFormat && !check.invalidMonth && !check.nullInput)
		return true;
	return moment(title, ['MMMM', 'YYYY', 'LL'], true).isValid();
}

async function tracePath(){
	const list = {};
	const path = document.querySelector('#path');
	const from = document.querySelector('#from').value;
	const to = document.querySelector('#to').value;

	if (!from || !to){
		path.innerHTML = "Um dos artigos está faltando.";
		return;
	}

	if (from === to){
		path.innerHTML = "Os dois são o mesmo artigo.";
		return;
	}

	const fromExists = await checkIfExists(from);
	const toExists = await checkIfExists(to);

	if (fromExists && toExists){
		path.innerHTML = 'Procurando...';

		const fromObject = {title: from, full_path: [from], direction: 0};
		const toObject = {title: to, full_path: [to], direction: 1};

		const links = new Queue(fromObject);
		list[from] = fromObject;
		links.push(toObject);
		list[to] = toObject;

		while(!links.empty){
			const {title, full_path, direction} = links.pop();
			let next_links;
			if (direction === 0){
				next_links = await getLinksFrom(title);
			}else{
				next_links = await getLinksTo(title);
			}
			if (next_links){
				for (const link in next_links){
					const next_title = next_links[link];
					if (next_title in list && list[next_title].direction === 1 - direction){
						let two_way_path;
						if (direction === 0){
							two_way_path = full_path;
							two_way_path.push(...list[next_title].full_path);
						}else{
							two_way_path = list[next_title].full_path;
							two_way_path.push(...full_path);
						}
						two_way_path[0] = `<strong>${two_way_path[0]}</strong>`;
						two_way_path[two_way_path.length - 1] = `<strong>${two_way_path[two_way_path.length - 1]}</strong>`;
						path.innerHTML = `${two_way_path.join(' > ')} com ${two_way_path.length - 1} cliques!`;
						return;
					}else if (!isMetaArticle(next_title) && !isADate(next_title)){
						const nextObject = {title: next_title, full_path: (direction === 0) ? [...full_path, next_title] : [next_title, ...full_path], direction: direction};
						list[next_title] = nextObject;
						links.push(nextObject);
					}
				}
			}
		}
		path.innerHTML = 'Não foi possível achar o caminho. :(';
	}else{
		path.innerHTML = 'Um dos artigos passados não é válido.';
	}
}