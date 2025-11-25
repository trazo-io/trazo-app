// Sample data for Transparency Mastery Learning Pathways
// This would typically come from the backend API

export const transparencyMasteryPathway = {
  title: "Agricultural Transparency Mastery",
  description: "Master the complete transparency approach to build consumer trust and unlock premium pricing",
  overallGoal: "Achieve 85%+ transparency score and 20-30% premium pricing through comprehensive agricultural documentation",
  stages: [
    {
      id: "stage_1_foundations",
      title: "Transparency Foundations",
      description: "Learn the fundamentals of Trazo's transparency-first approach and why it outperforms carbon-first systems",
      practices: [
        {
          id: "practice_transparency_basics",
          title: "Understanding Transparency vs Carbon Scores",
          category: "Getting Started with Transparency",
          difficulty: "beginner" as const,
          estimatedDuration: 15,
          transparencyImpact: "Learn why more documented events = higher trust scores (vs carbon penalty)",
          description: "Master the revolutionary shift from carbon-first to transparency-first agricultural marketing that rewards comprehensive documentation instead of penalizing it.",
          learningObjectives: [
            "Understand why traditional carbon platforms failed farmers",
            "Learn Trazo's transparency scoring system (0-100%)",
            "See real consumer behavior research data",
            "Calculate potential premium pricing from transparency"
          ],
          practiceSteps: [
            {
              id: "step_1",
              title: "Review Current Transparency Score",
              description: "Check your existing transparency score in Trazo dashboard",
              actionType: "analysis",
              estimatedTime: 5,
              transparencyPoints: 5
            },
            {
              id: "step_2", 
              title: "Log 3 Different Farming Events",
              description: "Document 3 different types of farming activities to see score increase",
              actionType: "documentation",
              estimatedTime: 15,
              transparencyPoints: 15
            },
            {
              id: "step_3",
              title: "Generate QR Code and Test Consumer View",
              description: "Create your first QR code and experience the consumer transparency page",
              actionType: "verification",
              estimatedTime: 10,
              transparencyPoints: 10
            },
            {
              id: "step_4",
              title: "Compare Transparency vs Carbon Display",
              description: "Analyze how transparency is presented vs carbon data on consumer pages",
              actionType: "analysis",
              estimatedTime: 10,
              transparencyPoints: 5
            }
          ],
          successMetrics: {
            transparencyScoreIncrease: 15,
            timeToValue: "1-2 hours",
            premiumPotential: "5-10% immediate"
          },
          imageUrl: "/education/transparency-basics.jpg"
        },
        {
          id: "practice_event_documentation",
          title: "Essential Event Documentation Workflow",
          category: "Farm Events Mastery",
          difficulty: "beginner" as const,
          estimatedDuration: 25,
          transparencyImpact: "Establish systematic documentation habits that increase transparency scores",
          description: "Build the foundation of transparency through consistent, high-quality agricultural event documentation using mobile-first workflows.",
          learningObjectives: [
            "Set up mobile documentation workflow",
            "Learn the 8 core agricultural event types",
            "Master photo documentation best practices",
            "Create systematic logging habits"
          ],
          practiceSteps: [
            {
              id: "step_1",
              title: "Install and Configure Mobile App",
              description: "Set up Trazo mobile app with GPS and camera permissions",
              actionType: "verification",
              estimatedTime: 10,
              transparencyPoints: 5
            },
            {
              id: "step_2",
              title: "Document Production Event with Photos",
              description: "Log a planting, irrigation, or harvest event with before/during/after photos",
              actionType: "photo",
              estimatedTime: 15,
              transparencyPoints: 10
            },
            {
              id: "step_3",
              title: "Document Chemical Application",
              description: "Log fertilizer or pest management application with equipment and materials photos",
              actionType: "photo",
              estimatedTime: 20,
              transparencyPoints: 15
            },
            {
              id: "step_4",
              title: "Review Documentation Quality",
              description: "Check all events have complete information, photos, and GPS coordinates",
              actionType: "verification",
              estimatedTime: 10,
              transparencyPoints: 10
            }
          ],
          successMetrics: {
            transparencyScoreIncrease: 25,
            timeToValue: "Same day",
            premiumPotential: "10-15%"
          },
          imageUrl: "/education/mobile-documentation.jpg"
        }
      ],
      requiredCompletions: 2,
      estimatedTimeHours: 1,
      transparencyScoreTarget: 40,
      premiumPotential: "10-15%"
    },
    {
      id: "stage_2_consumer_trust",
      title: "Consumer Trust Building",
      description: "Transform documentation into compelling stories that drive consumer purchasing decisions",
      practices: [
        {
          id: "practice_qr_storytelling",
          title: "QR Code Consumer Storytelling",
          category: "Building Consumer Trust",
          difficulty: "intermediate" as const,
          estimatedDuration: 30,
          transparencyImpact: "Create compelling transparency stories that increase consumer engagement by 340%",
          description: "Master the art of QR code storytelling to transform technical farming documentation into trust-building consumer narratives.",
          learningObjectives: [
            "Write consumer-friendly transparency narratives",
            "Implement progressive disclosure strategy",
            "Optimize trust signals and verification badges",
            "Measure consumer engagement metrics"
          ],
          practiceSteps: [
            {
              id: "step_1",
              title: "Audit Current QR Page",
              description: "Review your current QR page for trust signals and storytelling flow",
              actionType: "analysis",
              estimatedTime: 15,
              transparencyPoints: 10
            },
            {
              id: "step_2",
              title: "Write 3 Transparency Narratives",
              description: "Create compelling stories using consumer-friendly language",
              actionType: "documentation",
              estimatedTime: 30,
              transparencyPoints: 20
            },
            {
              id: "step_3",
              title: "Capture Story-Quality Photos",
              description: "Take 10 high-quality photos showing farming process and expertise",
              actionType: "photo",
              estimatedTime: 45,
              transparencyPoints: 25
            },
            {
              id: "step_4",
              title: "Test Consumer Understanding",
              description: "Share QR story with family/friends for clarity and trust feedback",
              actionType: "verification",
              estimatedTime: 20,
              transparencyPoints: 15
            }
          ],
          successMetrics: {
            transparencyScoreIncrease: 30,
            timeToValue: "1-3 days",
            premiumPotential: "15-25%"
          },
          imageUrl: "/education/qr-storytelling.jpg"
        },
        {
          id: "practice_trust_indicators",
          title: "Trust Indicator Optimization",
          category: "Building Consumer Trust",
          difficulty: "intermediate" as const,
          estimatedDuration: 35,
          transparencyImpact: "Optimize trust signals to achieve 89% higher consumer trust scores",
          description: "Implement and optimize trust indicators that convert transparency documentation into consumer confidence and purchasing decisions.",
          learningObjectives: [
            "Identify primary and secondary trust signals",
            "Implement blockchain verification badges",
            "Optimize photo metadata and GPS verification",
            "Build authentic farmer identity and story"
          ],
          practiceSteps: [
            {
              id: "step_1",
              title: "Enable Blockchain Verification",
              description: "Set up blockchain verification for all farming events",
              actionType: "verification",
              estimatedTime: 15,
              transparencyPoints: 20
            },
            {
              id: "step_2",
              title: "Complete Farmer Profile",
              description: "Add authentic farmer photos, story, and farm history",
              actionType: "documentation",
              estimatedTime: 25,
              transparencyPoints: 15
            },
            {
              id: "step_3",
              title: "Optimize Photo Evidence",
              description: "Ensure all photos have timestamps, GPS, and quality metadata",
              actionType: "photo",
              estimatedTime: 20,
              transparencyPoints: 20
            },
            {
              id: "step_4",
              title: "Add Certification Badges",
              description: "Upload and verify any organic, GAP, or sustainability certifications",
              actionType: "verification",
              estimatedTime: 15,
              transparencyPoints: 10
            }
          ],
          successMetrics: {
            transparencyScoreIncrease: 35,
            timeToValue: "1 week",
            premiumPotential: "20-30%"
          },
          imageUrl: "/education/trust-indicators.jpg"
        }
      ],
      requiredCompletions: 2,
      estimatedTimeHours: 2,
      transparencyScoreTarget: 70,
      premiumPotential: "20-25%"
    },
    {
      id: "stage_3_premium_market",
      title: "Premium Market Access",
      description: "Convert transparency into measurable business value through premium pricing and market relationships",
      practices: [
        {
          id: "practice_market_positioning",
          title: "Premium Market Positioning Strategy",
          category: "Market Success Through Transparency",
          difficulty: "advanced" as const,
          estimatedDuration: 45,
          transparencyImpact: "Position transparency as premium value proposition to access 20-30% higher pricing",
          description: "Develop and execute a market positioning strategy that converts transparency documentation into premium pricing and exclusive market relationships.",
          learningObjectives: [
            "Identify premium market opportunities",
            "Create transparency-focused value propositions",
            "Develop B2B transparency presentations",
            "Build premium customer relationships"
          ],
          practiceSteps: [
            {
              id: "step_1",
              title: "Market Research on Transparency Premiums",
              description: "Research transparency premium opportunities in your local market",
              actionType: "analysis",
              estimatedTime: 30,
              transparencyPoints: 15
            },
            {
              id: "step_2",
              title: "Develop Value Proposition Materials",
              description: "Create transparency-focused marketing and sales materials",
              actionType: "documentation",
              estimatedTime: 45,
              transparencyPoints: 25
            },
            {
              id: "step_3",
              title: "Approach Premium Partners",
              description: "Contact 3 potential premium market partners with transparency portfolio",
              actionType: "verification",
              estimatedTime: 60,
              transparencyPoints: 30
            },
            {
              id: "step_4",
              title: "Implement Pricing Strategy",
              description: "Set up transparency pricing strategy with specific premium targets",
              actionType: "documentation",
              estimatedTime: 20,
              transparencyPoints: 20
            }
          ],
          successMetrics: {
            transparencyScoreIncrease: 25,
            timeToValue: "2-4 weeks",
            premiumPotential: "25-40%"
          },
          imageUrl: "/education/premium-market.jpg"
        },
        {
          id: "practice_transparency_roi",
          title: "Transparency ROI Measurement & Optimization",
          category: "Market Success Through Transparency",
          difficulty: "advanced" as const,
          estimatedDuration: 40,
          transparencyImpact: "Track and optimize transparency ROI to achieve sustainable 30%+ premium pricing",
          description: "Implement comprehensive ROI tracking and optimization systems to measure and maximize the business impact of transparency investments.",
          learningObjectives: [
            "Set up transparency ROI tracking systems",
            "Measure customer acquisition and retention metrics",
            "Optimize transparency investment allocation",
            "Scale transparency for business growth"
          ],
          practiceSteps: [
            {
              id: "step_1",
              title: "Set Up ROI Tracking Systems",
              description: "Implement metrics tracking for transparency ROI and customer feedback",
              actionType: "verification",
              estimatedTime: 25,
              transparencyPoints: 15
            },
            {
              id: "step_2",
              title: "Conduct Customer Value Analysis",
              description: "Survey customers on transparency value perception and pricing sensitivity",
              actionType: "analysis",
              estimatedTime: 40,
              transparencyPoints: 20
            },
            {
              id: "step_3",
              title: "Optimize Investment Allocation",
              description: "Identify highest-ROI transparency activities and optimize resource allocation",
              actionType: "analysis",
              estimatedTime: 30,
              transparencyPoints: 25
            },
            {
              id: "step_4",
              title: "Scale Transparency Systems",
              description: "Develop scalable systems for increased production and market growth",
              actionType: "documentation",
              estimatedTime: 35,
              transparencyPoints: 30
            }
          ],
          successMetrics: {
            transparencyScoreIncrease: 20,
            timeToValue: "1-3 months",
            premiumPotential: "30-50%"
          },
          imageUrl: "/education/transparency-roi.jpg"
        }
      ],
      requiredCompletions: 2,
      estimatedTimeHours: 3,
      transparencyScoreTarget: 85,
      premiumPotential: "30-50%"
    },
    {
      id: "stage_4_mastery",
      title: "Transparency Leadership",
      description: "Become a transparency leader and help transform the agricultural industry",
      practices: [
        {
          id: "practice_industry_leadership",
          title: "Agricultural Transparency Leadership",
          category: "Troubleshooting & Success Tips",
          difficulty: "advanced" as const,
          estimatedDuration: 60,
          transparencyImpact: "Become industry leader in transparency while helping other farmers succeed",
          description: "Establish yourself as a thought leader in agricultural transparency while building industry networks and mentoring other farmers.",
          learningObjectives: [
            "Share transparency success stories publicly",
            "Mentor other farmers in transparency adoption",
            "Build industry partnerships and recognition",
            "Contribute to transparency best practices development"
          ],
          practiceSteps: [
            {
              id: "step_1",
              title: "Document Success Story",
              description: "Create comprehensive case study of your transparency transformation",
              actionType: "documentation",
              estimatedTime: 45,
              transparencyPoints: 25
            },
            {
              id: "step_2",
              title: "Share Industry Presentation",
              description: "Present your transparency success at farming conference or meeting",
              actionType: "verification",
              estimatedTime: 90,
              transparencyPoints: 35
            },
            {
              id: "step_3",
              title: "Mentor New Farmers",
              description: "Help 3 other farmers start their transparency journey",
              actionType: "documentation",
              estimatedTime: 120,
              transparencyPoints: 40
            },
            {
              id: "step_4",
              title: "Industry Partnership Development",
              description: "Establish formal partnerships with transparency-focused organizations",
              actionType: "verification",
              estimatedTime: 60,
              transparencyPoints: 30
            }
          ],
          successMetrics: {
            transparencyScoreIncrease: 15,
            timeToValue: "3-6 months",
            premiumPotential: "40-60% + industry recognition"
          },
          imageUrl: "/education/industry-leadership.jpg"
        }
      ],
      requiredCompletions: 1,
      estimatedTimeHours: 5,
      transparencyScoreTarget: 95,
      premiumPotential: "40-60%"
    }
  ]
};

// Additional pathway options
export const quickStartPathway = {
  title: "Transparency Quick Start",
  description: "Get started with transparency in just 2 hours and see immediate results",
  overallGoal: "Achieve 50% transparency score in 2 hours and 10-15% premium pricing within 1 week",
  stages: [
    {
      id: "quick_setup",
      title: "Quick Setup",
      description: "Essential transparency setup for immediate results",
      practices: [
        {
          id: "practice_quick_setup",
          title: "1-Hour Transparency Setup",
          category: "Getting Started with Transparency",
          difficulty: "beginner" as const,
          estimatedDuration: 60,
          transparencyImpact: "Achieve 50% transparency score and start building consumer trust immediately",
          description: "Get transparency working in just 1 hour with the essential setup that drives immediate consumer trust and premium pricing opportunities.",
          learningObjectives: [
            "Complete farm profile and verification",
            "Document 5 essential farming events",
            "Generate first QR code with consumer story",
            "Set up mobile documentation workflow"
          ],
          practiceSteps: [
            {
              id: "step_1",
              title: "Complete Farm Profile",
              description: "Add farm details, location, crops, and farmer story",
              actionType: "documentation",
              estimatedTime: 20,
              transparencyPoints: 15
            },
            {
              id: "step_2",
              title: "Document 5 Recent Events",
              description: "Log your 5 most recent farming activities with photos",
              actionType: "photo",
              estimatedTime: 25,
              transparencyPoints: 30
            },
            {
              id: "step_3",
              title: "Generate QR Code",
              description: "Create your first QR code and test the consumer experience",
              actionType: "verification",
              estimatedTime: 10,
              transparencyPoints: 15
            },
            {
              id: "step_4",
              title: "Share with First Customer",
              description: "Share QR code with a customer and collect feedback",
              actionType: "verification",
              estimatedTime: 15,
              transparencyPoints: 20
            }
          ],
          successMetrics: {
            transparencyScoreIncrease: 50,
            timeToValue: "1 hour",
            premiumPotential: "10-15%"
          },
          imageUrl: "/education/quick-start.jpg"
        }
      ],
      requiredCompletions: 1,
      estimatedTimeHours: 1,
      transparencyScoreTarget: 50,
      premiumPotential: "10-15%"
    }
  ]
};

export const allPathways = [
  transparencyMasteryPathway,
  quickStartPathway
];