import { useState, useEffect, useCallback } from 'react';
import { TransparencyCelebrationData } from '../components/Notifications/TransparencyCelebration';
import { 
  FaClipboardList, 
  FaCamera, 
  FaShieldAlt, 
  FaLeaf, 
  FaAward,
  FaCertificate,
  FaLock,
  FaTrophy
} from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';

interface TransparencyData {
  transparencyScore: number;
  farmName: string;
  productName: string;
  eventsDocumented: number;
  photoCount: number;
  isUSDAVerified: boolean;
  isBlockchainVerified: boolean;
  isTrazoVerified: boolean;
  scansCount: number;
  farmHistory: number;
}

interface UseCelebrationOptions {
  minScoreForCelebration?: number;
  celebrateOnScan?: boolean;
  celebrateOnMilestone?: boolean;
  showCelebrationOnce?: boolean;
}

export const useTransparencyCelebration = (
  transparencyData: TransparencyData | null,
  options: UseCelebrationOptions = {}
) => {
  const {
    minScoreForCelebration = 70,
    celebrateOnScan = true,
    celebrateOnMilestone = true,
    showCelebrationOnce = true
  } = options;

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<TransparencyCelebrationData | null>(null);
  const [triggerType, setTriggerType] = useState<'scan' | 'achievement' | 'milestone'>('scan');
  const [hasShownCelebration, setHasShownCelebration] = useState(false);

  // Generate achievements based on transparency data
  const generateAchievements = useCallback((data: TransparencyData) => {
    const achievements = [];

    // Documentation achievements
    if (data.eventsDocumented >= 10) {
      achievements.push({
        id: 'documentation_champion',
        name: 'Documentación Completa',
        icon: FaClipboardList,
        description: `${data.eventsDocumented} eventos documentados`,
        isNew: data.eventsDocumented >= 15
      });
    }

    // Photo evidence achievements
    if (data.photoCount >= 5) {
      achievements.push({
        id: 'visual_transparency',
        name: 'Transparencia Visual',
        icon: FaCamera,
        description: `${data.photoCount} fotos de evidencia`,
        isNew: data.photoCount >= 10
      });
    }

    // Verification achievements
    if (data.isUSDAVerified) {
      achievements.push({
        id: 'usda_verified',
        name: 'USDA Verificado',
        icon: FaCertificate,
        description: 'Estándares oficiales cumplidos',
        isNew: false
      });
    }

    if (data.isBlockchainVerified) {
      achievements.push({
        id: 'blockchain_secured',
        name: 'Blockchain Seguro',
        icon: FaLock,
        description: 'Datos inmutables garantizados',
        isNew: false
      });
    }

    if (data.isTrazoVerified) {
      achievements.push({
        id: 'trazo_certified',
        name: 'Trazo Certificado',
        icon: MdVerified,
        description: 'Transparencia certificada por Trazo',
        isNew: true
      });
    }

    // Excellence achievements
    if (data.transparencyScore >= 95) {
      achievements.push({
        id: 'transparency_perfection',
        name: 'Transparencia Perfecta',
        icon: FaTrophy,
        description: '95%+ transparencia alcanzada',
        isNew: true
      });
    }

    // Community achievements
    if (data.scansCount >= 100) {
      achievements.push({
        id: 'community_favorite',
        name: 'Favorito de la Comunidad',
        icon: FaAward,
        description: `${data.scansCount}+ escaneos QR`,
        isNew: false
      });
    }

    return achievements;
  }, []);

  // Generate milestones based on transparency score
  const generateMilestones = useCallback((score: number) => {
    return [
      {
        level: 'Transparencia Básica',
        description: 'Información básica disponible',
        unlocked: score >= 50
      },
      {
        level: 'Buena Transparencia',
        description: 'Documentación regular y confiable',
        unlocked: score >= 70
      },
      {
        level: 'Excelente Transparencia',
        description: 'Documentación comprensiva y verificada',
        unlocked: score >= 85
      },
      {
        level: 'Transparencia Certificada',
        description: 'Máximo nivel de transparencia agrícola',
        unlocked: score >= 95
      }
    ];
  }, []);

  // Generate impact and consumer messages
  const generateMessages = useCallback((data: TransparencyData) => {
    const impactMessages = [
      `Al elegir productos transparentes, apoyas ${data.eventsDocumented} eventos agrícolas documentados.`,
      `Tu elección incentiva a ${data.farmName} a mantener prácticas transparentes.`,
      `Cada escaneo muestra demanda de agricultura responsable y transparente.`,
      `Apoyas innovación en transparencia agrícola y trazabilidad de alimentos.`
    ];

    const consumerMessages = [
      `¡Elegiste excelencia! ${data.productName} representa agricultura transparente de calidad.`,
      `Tu decisión consciente apoya a ${data.farmName} en su compromiso con la transparencia.`,
      `Gracias por valorar la transparencia. Estás creando demanda de agricultura responsable.`,
      `¡Eres parte del cambio! Tu elección promueve prácticas agrícolas transparentes.`
    ];

    // Select messages based on transparency score
    const impactIndex = Math.min(Math.floor(data.transparencyScore / 25), impactMessages.length - 1);
    const consumerIndex = Math.min(Math.floor(data.transparencyScore / 25), consumerMessages.length - 1);

    return {
      impact: impactMessages[impactIndex],
      consumer: consumerMessages[consumerIndex]
    };
  }, []);

  // Trigger celebration based on transparency score and conditions
  const triggerCelebration = useCallback((
    type: 'scan' | 'achievement' | 'milestone' = 'scan'
  ) => {
    if (!transparencyData) return;
    
    // Check if we should show celebration
    const shouldShow = transparencyData.transparencyScore >= minScoreForCelebration;
    const canShow = !showCelebrationOnce || !hasShownCelebration;
    
    if (!shouldShow || !canShow) return;

    const achievements = generateAchievements(transparencyData);
    const milestones = generateMilestones(transparencyData.transparencyScore);
    const messages = generateMessages(transparencyData);

    const celebrationData: TransparencyCelebrationData = {
      transparencyScore: transparencyData.transparencyScore,
      farmName: transparencyData.farmName,
      productName: transparencyData.productName,
      achievements,
      milestones,
      impactMessage: messages.impact,
      consumerMessage: messages.consumer
    };

    setCelebrationData(celebrationData);
    setTriggerType(type);
    setShowCelebration(true);
    setHasShownCelebration(true);
  }, [
    transparencyData,
    minScoreForCelebration,
    showCelebrationOnce,
    hasShownCelebration,
    generateAchievements,
    generateMilestones,
    generateMessages
  ]);

  // Auto-trigger celebration on scan if enabled
  useEffect(() => {
    if (transparencyData && celebrateOnScan) {
      // Delay to allow page to load first
      const timer = setTimeout(() => {
        triggerCelebration('scan');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [transparencyData, celebrateOnScan, triggerCelebration]);

  // Check for milestone celebrations
  useEffect(() => {
    if (transparencyData && celebrateOnMilestone) {
      const milestones = generateMilestones(transparencyData.transparencyScore);
      const hasNewMilestone = milestones.some(m => m.unlocked);
      
      if (hasNewMilestone && transparencyData.transparencyScore >= 90) {
        triggerCelebration('milestone');
      }
    }
  }, [transparencyData, celebrateOnMilestone, triggerCelebration, generateMilestones]);

  const closeCelebration = useCallback(() => {
    setShowCelebration(false);
    setTimeout(() => {
      setCelebrationData(null);
    }, 300); // Allow for modal close animation
  }, []);

  const resetCelebrationState = useCallback(() => {
    setHasShownCelebration(false);
    setShowCelebration(false);
    setCelebrationData(null);
  }, []);

  return {
    showCelebration,
    celebrationData,
    triggerType,
    triggerCelebration,
    closeCelebration,
    resetCelebrationState,
    canCelebrate: transparencyData ? transparencyData.transparencyScore >= minScoreForCelebration : false
  };
};

export default useTransparencyCelebration;