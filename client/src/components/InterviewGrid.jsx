import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneCall, PhoneOff, ClipboardCheck, Save } from 'lucide-react';

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export default function InterviewGrid({ roomId, username, socket }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);

  const [inCall, setInCall] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [remoteConnected, setRemoteConnected] = useState(false);

  const [rubric, setRubric] = useState({
    problemSolving: 4,
    codeQuality: 4,
    communication: 4,
    speed: 3,
    notes: '',
  });
  const [rubricSaved, setRubricSaved] = useState(false);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteConnected(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', { roomId, candidate: event.candidate });
      }
    };

    peerRef.current = pc;
    return pc;
  };

  useEffect(() => {
    if (!socket) return undefined;

    const handleOffer = async ({ fromSocketId, offer }) => {
      try {
        if (!localStreamRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          localStreamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          setInCall(true);
        }
        const pc = peerRef.current || createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { roomId, targetSocketId: fromSocketId, answer });
      } catch (err) {
        console.error('WebRTC offer handling error:', err);
      }
    };

    const handleAnswer = async ({ answer }) => {
      try {
        if (peerRef.current) {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('WebRTC answer handling error:', err);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        if (peerRef.current && candidate) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('WebRTC ICE candidate error:', err);
      }
    };

    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    return () => {
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
    };
  }, [socket, roomId]);

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setInCall(true);

      const pc = createPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket?.emit('offer', { roomId, offer });
    } catch (err) {
      console.error('Could not start camera/microphone:', err);
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setInCall(false);
    setRemoteConnected(false);
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const next = !micEnabled;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
    setMicEnabled(next);
  };

  const toggleCam = () => {
    if (!localStreamRef.current) return;
    const next = !camEnabled;
    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    setCamEnabled(next);
  };

  const handleSaveRubric = () => {
    localStorage.setItem(`synapse_rubric_${roomId}`, JSON.stringify(rubric));
    setRubricSaved(true);
    setTimeout(() => setRubricSaved(false), 2000);
  };

  const avgScore = (
    (rubric.problemSolving + rubric.codeQuality + rubric.communication + rubric.speed) /
    4
  ).toFixed(1);

  return (
    <div className="flex flex-col h-full bg-surface-900 rounded-xl border border-surface-800 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-950/80 border-b border-surface-800">
        <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
          <Video size={15} className="text-cyan-400" />
          <span>CoderPad Live Interview Grid</span>
        </div>

        <div className="flex items-center gap-1.5">
          {inCall ? (
            <>
              <button
                onClick={toggleMic}
                className={`p-1.5 rounded-md border text-xs ${
                  micEnabled
                    ? 'bg-surface-800 border-surface-700 text-gray-200'
                    : 'bg-red-950 border-red-800 text-red-300'
                }`}
                title="Toggle Microphone"
              >
                {micEnabled ? <Mic size={13} /> : <MicOff size={13} />}
              </button>
              <button
                onClick={toggleCam}
                className={`p-1.5 rounded-md border text-xs ${
                  camEnabled
                    ? 'bg-surface-800 border-surface-700 text-gray-200'
                    : 'bg-red-950 border-red-800 text-red-300'
                }`}
                title="Toggle Camera"
              >
                {camEnabled ? <Video size={13} /> : <VideoOff size={13} />}
              </button>
              <button
                onClick={endCall}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                <PhoneOff size={13} /> Leave
              </button>
            </>
          ) : (
            <button
              onClick={startCall}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
            >
              <PhoneCall size={13} /> Join Video Call
            </button>
          )}
        </div>
      </div>

      {/* WebRTC Video Feeds */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-surface-950/60 border-b border-surface-800">
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video border border-surface-800">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-semibold text-cyan-300">
            {username || 'You'} (Local)
          </div>
        </div>

        <div className="relative bg-black rounded-lg overflow-hidden aspect-video border border-surface-800 flex items-center justify-center">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          {!remoteConnected && (
            <span className="text-[11px] text-gray-500 absolute">Waiting for candidate peer...</span>
          )}
          <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-semibold text-gray-300">
            Remote Peer
          </div>
        </div>
      </div>

      {/* 4-Pillar Interview Grading Rubric & Private Notes */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-gray-400">
            <ClipboardCheck size={13} className="text-cyan-400" />
            <span>4-Pillar Rubric</span>
          </div>
          <span className="text-xs font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-800 px-2 py-0.5 rounded">
            Avg: {avgScore} / 5.0
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { key: 'problemSolving', label: 'Problem Solving' },
            { key: 'codeQuality', label: 'Code Quality' },
            { key: 'communication', label: 'Communication' },
            { key: 'speed', label: 'Execution Speed' },
          ].map((pillar) => (
            <div key={pillar.key} className="bg-surface-950/60 border border-surface-800 rounded-lg p-2">
              <div className="flex justify-between text-[11px] text-gray-300 mb-1">
                <span>{pillar.label}</span>
                <span className="font-mono font-bold text-cyan-400">{rubric[pillar.key]}/5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={rubric[pillar.key]}
                onChange={(e) =>
                  setRubric((prev) => ({ ...prev, [pillar.key]: Number(e.target.value) }))
                }
                className="w-full accent-cyan-500"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-1">
            Private Interviewer Notes
          </label>
          <textarea
            rows={3}
            value={rubric.notes}
            onChange={(e) => setRubric((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Record observations on algorithmic thinking, edge cases, and communication..."
            className="w-full bg-surface-950 text-gray-200 placeholder-gray-500 text-xs rounded-lg p-2.5 border border-surface-800 outline-none focus:border-cyan-500 resize-none"
          />
        </div>

        <button
          onClick={handleSaveRubric}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          <Save size={13} />
          <span>{rubricSaved ? 'Evaluation Saved!' : 'Save Candidate Evaluation'}</span>
        </button>
      </div>
    </div>
  );
}
