// features/voice/recorder.js — grabación con SpeechRecognition
export let _vbRec = null
export let _vbFinal = ''
export let _vbInterim = ''
export let _vbRetries = 0
export let _isRecording = false
let _timeout = null

export function startRecording(onResult, onEnd, onError) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return onError('no_support')

  if (_vbRec) { try { _vbRec.abort() } catch (x) {} _vbRec = null }
  _vbFinal = ''; _vbInterim = ''; _isRecording = true

  const rec = new SR()
  _vbRec = rec
  rec.lang = 'es-PE'
  rec.continuous = true
  rec.interimResults = true
  rec.maxAlternatives = 1

  rec.onresult = (ev) => {
    let final = '', interim = ''
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      if (ev.results[i].isFinal) final += ev.results[i][0].transcript
      else interim += ev.results[i][0].transcript
    }
    if (final) _vbFinal += final
    _vbInterim = interim
    onResult(_vbFinal, _vbInterim)
  }

  rec.onerror = (ev) => {
    clearTimeout(_timeout)
    _isRecording = false; _vbRec = null
    if (ev.error !== 'aborted') onError(ev.error)
  }

  rec.onend = () => {
    clearTimeout(_timeout)
    _isRecording = false; _vbRec = null
    onEnd((_vbFinal + ' ' + _vbInterim).trim())
  }

  _timeout = setTimeout(() => { if (_vbRec) try { _vbRec.stop() } catch (x) {} }, 15000)
  try { rec.start() } catch (x) { onError('start_failed') }
}

export function stopRecording() {
  clearTimeout(_timeout)
  if (_vbRec) { try { _vbRec.stop() } catch (x) {} }
}
