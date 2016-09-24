
var storage = require('services/storage')

module.exports = class Source extends require('base/view'){

	prototype(){
		this.name = 'Source'
		this.props = {
			text:{inward:'Edit', prop:'text', value:''}
		}
		this.tools = {
			Code:class extends require('views/code'){
				prototype(){
					this.name = 'Edit'
					this.drawPadding = [0,0,0,4]
					this.wrap = true
					this.padding = [0,0,0,0]
				}
				onKeyS(e){
					if(!e.meta && !e.ctrl) return true
					this.parent.onSave(this.serializeWithFormatting())
				}
				onParsed(){
					this.parent.onParsed(this.text, this.trace)
				}
			},
			Probes:require('./probes')
		}
	}

	onSave(text){
		storage.save(this.resource.path, text)
	}

	onParsed(text, trace){
		var resource = this.resource
		if(!resource) return
		// update our resource
		resource.data = text
		resource.trace = trace
		this.app.codeChange(resource)

		/*
		var proc = this.app.find('Process'+this.resource.path)
		if(proc){
			// alright so 

			var res = projectToResources(this.app.projectData, proc.resources)
			res[this.fileName] = this.trace
			console.log("---- restarting user process ----")
			//return
			proc.worker.init(
				this.fileName,
				res
			)
		}*/
	}

	onCompose(){
		return [
			new this.Code({
				x:'31',
				w:'100%-this.x'
				//h:'100%-40'
			}),
			new this.Probes({
				x:'0',
				w:'31',
				///y:'100%-this.h',
				//h:'40',
				onAfterCompose(){
					this.code = this.parent.find('Edit')
					this.code.onBeginFormatAST = this.onBeginFormatAST.bind(this)
					this.code.onProbe = this.onProbe.bind(this)
				}
			})
		]
	}
}