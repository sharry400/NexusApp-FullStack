import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Copy, CheckCheck, Users
} from 'lucide-react';

const SOCKET_URL = 'https://nexus-app-full-stack.vercel.app';
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

interface RemoteParticipant {
  socketId: string;
  stream: MediaStream;
  name: string;
}

const RemoteVideoBox: React.FC<{ participant: RemoteParticipant }> = React.memo(({ participant }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);
  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute bottom-3 left-3 bg-black bg-opacity-60 text-white text-sm px-2 py-1 rounded-md">
        {participant.name}
      </div>
    </div>
  );
});

export const VideoCallPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<{ [socketId: string]: RTCPeerConnection }>({});
  // Use ref for participants to avoid stale closures in async callbacks
  const participantNamesRef = useRef<{ [socketId: string]: string }>({});
  const initializedRef = useRef(false);

  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const createPeerConnection = useCallback((remoteSocketId: string) => {
    // Prevent duplicate peer connections
    if (peerConnectionsRef.current[remoteSocketId]) {
      return peerConnectionsRef.current[remoteSocketId];
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', { candidate: e.candidate, to: remoteSocketId });
      }
    };

    pc.ontrack = (e) => {
      const remoteName = participantNamesRef.current[remoteSocketId] || 'Remote User';
      setRemoteParticipants(prev => {
        if (prev.find(r => r.socketId === remoteSocketId)) return prev;
        return [...prev, { socketId: remoteSocketId, stream: e.streams[0], name: remoteName }];
      });
    };

    peerConnectionsRef.current[remoteSocketId] = pc;
    return pc;
  }, []);

  useEffect(() => {
    // Prevent double-initialization in React Strict Mode
    if (initializedRef.current) return;
    initializedRef.current = true;

    const startCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const socket = io(SOCKET_URL, { transports: ['websocket'] });
        socketRef.current = socket;

        socket.emit('join-room', {
          roomId,
          userId: user?.id || (user as any)?._id,
          userName: user?.name || 'Unknown'
        });

        // Existing users in room — WE initiate offer to each
        socket.on('existing-users', async (existingUsers: { socketId: string; userName: string }[]) => {
          for (const eu of existingUsers) {
            participantNamesRef.current[eu.socketId] = eu.userName;
            const pc = createPeerConnection(eu.socketId);
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('offer', { offer, to: eu.socketId });
            } catch (err) {
              console.error('Offer error:', err);
            }
          }
        });

        // New user joins after us — they send offer to us
        socket.on('user-joined', ({ socketId, userName }: { socketId: string; userName: string }) => {
          participantNamesRef.current[socketId] = userName;
        });

        // We receive an offer — send back answer
        socket.on('offer', async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
          const pc = createPeerConnection(from);
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('answer', { answer, to: from });
          } catch (err) {
            console.error('Answer error:', err);
          }
        });

        socket.on('answer', async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
          const pc = peerConnectionsRef.current[from];
          if (pc && pc.signalingState !== 'stable') {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (err) {
              console.error('Set remote description error:', err);
            }
          }
        });

        socket.on('ice-candidate', async ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
          const pc = peerConnectionsRef.current[from];
          if (pc) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              // Ignore ICE errors when connection is already closed
            }
          }
        });

        socket.on('user-left', ({ socketId }: { socketId: string }) => {
          const pc = peerConnectionsRef.current[socketId];
          if (pc) {
            pc.close();
            delete peerConnectionsRef.current[socketId];
          }
          delete participantNamesRef.current[socketId];
          setRemoteParticipants(prev => prev.filter(r => r.socketId !== socketId));
        });

      } catch (err: any) {
        console.error('Media Error:', err);
        setError('Camera/Microphone access denied. Please allow permissions and refresh.');
      }
    };

    startCall();

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      socketRef.current?.emit('leave-room', { roomId });
      socketRef.current?.disconnect();
      socketRef.current = null;
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
    };
  }, [roomId, user?.id]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(p => !p);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOff(p => !p);
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    socketRef.current?.emit('leave-room', { roomId });
    socketRef.current?.disconnect();
    navigate(-1);
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalParticipants = remoteParticipants.length + 1;
  const gridCols = remoteParticipants.length === 0
    ? 'grid-cols-1 max-w-2xl mx-auto'
    : remoteParticipants.length === 1
    ? 'grid-cols-1 sm:grid-cols-2'
    : 'grid-cols-2 lg:grid-cols-3';

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-white max-w-md p-8">
          <VideoOff size={48} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold mb-2">Camera Access Required</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 border border-gray-600 text-white rounded-md hover:bg-gray-800">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-white font-semibold">Nexus Video Call</span>
          <span className="text-gray-400 text-sm">Room: {roomId?.slice(0, 8)}...</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={copyRoomLink}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            {copied ? <CheckCheck size={16} className="text-green-400" /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <div className="flex items-center gap-1 bg-gray-800 px-3 py-1 rounded-full text-gray-300 text-sm">
            <Users size={14} />
            <span>{totalParticipants}</span>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-6 overflow-auto">
        <div className={`grid gap-4 ${gridCols}`}>
          {/* Local Video (You) */}
          <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {isVideoOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-white text-2xl font-bold">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-black bg-opacity-60 text-white text-sm px-2 py-1 rounded-md flex items-center gap-1">
              {isMuted && <MicOff size={12} className="text-red-400" />}
              <span>{user?.name} (You)</span>
            </div>
          </div>

          {/* Remote Videos */}
          {remoteParticipants.map(participant => (
            <RemoteVideoBox key={participant.socketId} participant={participant} />
          ))}
        </div>

        {remoteParticipants.length === 0 && (
          <div className="text-center mt-6">
            <p className="text-gray-400 text-sm animate-pulse">Waiting for others to join...</p>
            <p className="text-gray-500 text-xs mt-1">Share the room link to invite participants</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 border-t border-gray-800 px-6 py-5">
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isVideoOff ? 'Turn on Camera' : 'Turn off Camera'}
          >
            {isVideoOff ? <VideoOff size={20} className="text-white" /> : <Video size={20} className="text-white" />}
          </button>

          <button
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-lg"
            title="End Call"
          >
            <PhoneOff size={24} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
